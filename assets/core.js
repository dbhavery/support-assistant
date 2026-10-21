/*
 * Support assistant core: the logic shared by the browser widget, the
 * serverless function (api/answer.js) and the tests.
 *
 * - parseArticle / buildIndex / search: split the help articles in kb/ into
 *   one passage per "## " section and rank passages with BM25.
 * - matchPhrase / classifyMessage: trigger matching on whole words, so
 *   "again" does not fire on "against".
 * - requestModelAnswer: ask /api/answer for a model answer and fall back to
 *   the best retrieved passage on any failure.
 * - buildHandoffSummary: the summary a person would receive on handoff.
 *
 * Plain ES5 with no dependencies. In a browser it sets window.SupportCore;
 * in Node it is a CommonJS module.
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SupportCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ── Text normalization ────────────────────────────────────────────────────

  var STOPWORDS = {};
  ("a an and are as at be but by can could do does did for from had has have how " +
    "i if in into is it its me my of on or our so than that the their them then " +
    "there these they this to up us was we were what when where which who why " +
    "will with would you your yours i'm im it's its can't cant don't dont get got " +
    "any about just want need please whats wheres hows take tell know").split(" ").forEach(function (w) { STOPWORDS[w] = true; });

  // Lowercase, keep letters, digits and "$", collapse everything else to spaces.
  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9$]+/g, " ")
      .trim();
  }

  // Light suffix stripping so "returns", "returned" and "returning" share a
  // term with "return". Deliberately small: it only has to make the six help
  // articles and ordinary questions meet in the middle.
  function stem(word) {
    if (word.length <= 3) return word;
    if (/ies$/.test(word) && word.length > 4) return word.slice(0, -3) + "y";
    if (/(ss|us)$/.test(word)) return word;
    if (/ing$/.test(word) && word.length > 5) return word.slice(0, -3);
    if (/ed$/.test(word) && word.length > 4) return word.slice(0, -2);
    if (/es$/.test(word) && /(ch|sh|x|z)es$/.test(word)) return word.slice(0, -2);
    if (/s$/.test(word)) return word.slice(0, -1);
    return word;
  }

  function tokenize(text) {
    var words = normalize(text).split(" ");
    var out = [];
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (!w || STOPWORDS[w]) continue;
      out.push(stem(w));
    }
    return out;
  }

  // Question words that point at a topic the articles name differently.
  // Applied to queries only, never to the articles.
  var QUERY_SYNONYMS = {
    much: "cost", price: "cost", pricing: "cost", fee: "cost", fees: "cost",
    long: "day", soon: "day",
    open: "hour", close: "hour", closed: "hour",
    where: "track", wheres: "track",
    broke: "defect", broken: "defect", ripped: "defect", torn: "defect",
    login: "password", log: "password", signin: "password",
  };

  function queryTerms(text) {
    var words = normalize(text).split(" ");
    var extra = [];
    words.forEach(function (w) { if (QUERY_SYNONYMS[w]) extra.push(QUERY_SYNONYMS[w]); });
    return tokenize(text).concat(extra);
  }

  // ── Articles and passages ─────────────────────────────────────────────────

  function slugify(text) {
    return normalize(text).replace(/ /g, "-");
  }

  // Remove markdown emphasis and the demo disclaimer line so the passage reads
  // as plain text in the widget.
  function cleanMarkdown(text) {
    return String(text)
      .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
      // Undo the hard line wraps inside a paragraph or list item, so the text
      // reflows in the chat panel. Blank lines and list markers are kept.
      .replace(/([^\n])\n(?!\n|[ \t]*- |[ \t]*\d+\. )/g, "$1 ")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/(^|\s)_(.+?)_(?=\s|$)/g, "$1$2")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /**
   * Split one markdown help article into passages, one per "## " section.
   * Returns { id, title, passages: [{ id, articleId, article, section, text }] }.
   */
  function parseArticle(fileName, markdown) {
    var articleId = String(fileName).replace(/\.md$/, "");
    var lines = String(markdown).replace(/\r\n/g, "\n").split("\n");
    var title = articleId;
    var passages = [];
    var current = null;

    function flush() {
      if (!current) return;
      var text = cleanMarkdown(current.lines.join("\n"));
      if (text) {
        passages.push({
          id: articleId + "#" + slugify(current.section),
          articleId: articleId,
          article: title,
          section: current.section,
          text: text,
        });
      }
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var h1 = /^# (.+)$/.exec(line);
      var h2 = /^## (.+)$/.exec(line);
      if (h1 && !current) { title = h1[1].trim(); continue; }
      if (h2) {
        flush();
        current = { section: h2[1].trim(), lines: [] };
        continue;
      }
      if (current) current.lines.push(line);
    }
    flush();
    return { id: articleId, title: title, passages: passages };
  }

  // ── BM25 ──────────────────────────────────────────────────────────────────

  var K1 = 1.4;
  var B = 0.75;
  // Section headings and article titles say what a passage is about, so their
  // terms are counted this many extra times.
  var HEADING_WEIGHT = 2;

  /** Build a BM25 index over an array of parsed articles. */
  function buildIndex(articles) {
    var docs = [];
    var df = {};
    var totalLen = 0;
    articles.forEach(function (article) {
      article.passages.forEach(function (p) {
        var terms = tokenize(p.text);
        // The file name ("returns-policy") is a heading too.
        var headingTerms = tokenize(p.section + " " + p.article + " " + p.articleId.replace(/-/g, " "));
        for (var r = 0; r < HEADING_WEIGHT; r++) terms = terms.concat(headingTerms);
        var tf = {};
        terms.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
        Object.keys(tf).forEach(function (t) { df[t] = (df[t] || 0) + 1; });
        totalLen += terms.length;
        docs.push({ passage: p, tf: tf, len: terms.length });
      });
    });
    return {
      docs: docs,
      df: df,
      n: docs.length,
      avgLen: docs.length ? totalLen / docs.length : 0,
      byId: docs.reduce(function (m, d) { m[d.passage.id] = d.passage; return m; }, {}),
    };
  }

  function idf(index, term) {
    var n = index.df[term] || 0;
    return Math.log(1 + (index.n - n + 0.5) / (n + 0.5));
  }

  /**
   * Rank passages for a query. Returns up to `limit` results, best first,
   * each { passage, score }. Passages that share no term with the query are
   * left out.
   */
  function search(index, query, limit) {
    limit = limit || 3;
    var qTerms = queryTerms(query);
    var seen = {};
    qTerms = qTerms.filter(function (t) { if (seen[t]) return false; seen[t] = true; return true; });
    var results = [];
    index.docs.forEach(function (doc) {
      var score = 0;
      qTerms.forEach(function (t) {
        var f = doc.tf[t];
        if (!f) return;
        score += idf(index, t) * (f * (K1 + 1)) / (f + K1 * (1 - B + B * doc.len / index.avgLen));
      });
      if (score > 0) results.push({ passage: doc.passage, score: score });
    });
    results.sort(function (a, b) { return b.score - a.score; });
    return results.slice(0, limit);
  }

  // Below this BM25 score the best passage is treated as "no article covers
  // this". Set from the questions in test/retrieval.test.js: real questions
  // score well above it, and off-topic ones that share one weak word stay under.
  var MIN_SCORE = 2.5;

  // ── Triggers ──────────────────────────────────────────────────────────────

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * True when `phrase` appears in `text` as whole words. "again" matches
   * "not again" but not "against"; "agent" does not match "agents" or
   * "agency". Both sides go through normalize() first.
   */
  function matchPhrase(text, phrase) {
    var t = " " + normalize(text) + " ";
    var p = normalize(phrase);
    if (!p) return false;
    return new RegExp("(^|[^a-z0-9$])" + escapeRegExp(p) + "(?=[^a-z0-9]|$)").test(t);
  }

  function firstMatch(text, phrases) {
    for (var i = 0; i < phrases.length; i++) {
      if (matchPhrase(text, phrases[i])) return phrases[i];
    }
    return null;
  }

  /**
   * Decide what kind of message this is before any retrieval runs.
   * Order: frustration, then a request for a person or a high-stakes topic,
   * then out-of-scope, then a normal question.
   */
  function classifyMessage(text, rules) {
    var hit = firstMatch(text, rules.frustrationTriggers || []);
    if (hit) return { kind: "frustration", trigger: hit };
    hit = firstMatch(text, rules.escalationTriggers || []);
    if (hit) return { kind: "escalate", trigger: hit };
    var oos = rules.outOfScope || [];
    for (var i = 0; i < oos.length; i++) {
      hit = firstMatch(text, oos[i].kw);
      if (hit) return { kind: "oos", trigger: hit, topic: oos[i].topic };
    }
    return { kind: "question" };
  }

  // ── Fallback and the model call ───────────────────────────────────────────

  /** The answer shown when no model answer is available: the passage itself. */
  function passageFallback(passage, reason) {
    return {
      mode: "article",
      reason: reason || "model-off",
      answer: passage.text,
      sources: [{ id: passage.id, article: passage.article, section: passage.section }],
      passage: passage,
    };
  }

  /**
   * Ask the serverless function for a model answer grounded in `passages`.
   * Any failure (network error, timeout, non-200, the model switched off,
   * a guard rejection, a malformed body) returns the best passage instead,
   * so the widget always has something true to show.
   *
   * `fetchImpl` is injected so tests can mock it.
   */
  function requestModelAnswer(fetchImpl, endpoint, question, passages, timeoutMs) {
    var best = passages[0];
    if (!fetchImpl) return Promise.resolve(passageFallback(best, "no-fetch"));
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs || 10000) : null;

    return Promise.resolve()
      .then(function () {
        return fetchImpl(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            question: question,
            passageIds: passages.map(function (p) { return p.id; }),
          }),
          signal: controller ? controller.signal : undefined,
        });
      })
      .then(function (res) {
        if (!res || !res.ok) return passageFallback(best, "http-" + (res ? res.status : "none"));
        return res.json().then(function (body) {
          if (body && body.mode === "model" && typeof body.answer === "string" && body.answer.trim()) {
            return {
              mode: "model",
              answer: body.answer.trim(),
              sources: Array.isArray(body.sources) && body.sources.length
                ? body.sources
                : [{ id: best.id, article: best.article, section: best.section }],
              passage: best,
            };
          }
          if (body && body.mode === "unknown") {
            return { mode: "unknown", answer: String(body.answer || ""), sources: [], passage: best };
          }
          return passageFallback(best, (body && body.reason) || (body && body.mode) || "bad-body");
        });
      })
      .catch(function () { return passageFallback(best, "network"); })
      .then(function (result) {
        if (timer) clearTimeout(timer);
        return result;
      });
  }

  // ── Handoff ───────────────────────────────────────────────────────────────

  /**
   * Build the summary a person would receive on handoff.
   * `transcript` is [{ role: "customer"|"assistant", text }].
   * `topic` is the article title of the last answered question, if any.
   */
  function buildHandoffSummary(transcript, topic, reason) {
    var lines = [];
    lines.push("Reason for handoff: " + (reason || "customer asked for a person"));
    lines.push("Topic: " + (topic || "not detected"));
    var customerTurns = transcript.filter(function (t) { return t.role === "customer"; });
    lines.push("Customer messages: " + customerTurns.length);
    lines.push("");
    lines.push("Conversation:");
    transcript.forEach(function (t) {
      var who = t.role === "customer" ? "Customer" : "Assistant";
      lines.push(who + ": " + String(t.text).replace(/\s+/g, " ").trim());
    });
    return lines.join("\n");
  }

  return {
    normalize: normalize,
    tokenize: tokenize,
    stem: stem,
    parseArticle: parseArticle,
    buildIndex: buildIndex,
    search: search,
    MIN_SCORE: MIN_SCORE,
    matchPhrase: matchPhrase,
    classifyMessage: classifyMessage,
    passageFallback: passageFallback,
    requestModelAnswer: requestModelAnswer,
    buildHandoffSummary: buildHandoffSummary,
  };
});
