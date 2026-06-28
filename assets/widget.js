/*
 * Customer Support Assistant, static showcase widget.
 *
 * Same Shadow-DOM design and behaviour as the real embeddable widget
 * (apps/customer-assistant/widget), but the /chat round-trip is replaced with a
 * client-side retrieval over the bundled help articles (assets/kb.js). No
 * backend, no API key, always on.
 *
 * Behaviour follows ../RESEARCH.md: discloses it's a virtual assistant; a
 * persistent "Talk to a person" exit; frustration -> empathy + escalate; no
 * looping; confirms resolution after every answer; hands off with full context.
 */
(function () {
  "use strict";

  var KB = window.SUPPORT_KB;
  if (!KB) return;
  var C = KB.company.colors;
  var CONTACT = KB.company.escalation.contact;
  var P = C.primary, ACC = C.accent, BG = C.background, SURF = C.surface, TXT = C.text;
  var initial = (KB.company.display_name || "?").trim().charAt(0).toUpperCase();

  var host = document.createElement("div");
  host.setAttribute("data-customer-assistant", KB.company.id);
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: "open" });

  var style = document.createElement("style");
  style.textContent =
    ":host{all:initial}" +
    "*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}" +

    ".launcher{position:fixed;bottom:22px;right:22px;width:62px;height:62px;border-radius:50%;border:none;cursor:pointer;" +
    "display:grid;place-items:center;color:#fff;z-index:2147483000;" +
    "background:" + P + ";background:linear-gradient(150deg," + lighten(P, 16) + "," + P + ");" +
    "box-shadow:0 10px 26px " + alpha(P, .42) + ",0 2px 6px rgba(0,0,0,.3);" +
    "transition:transform .22s cubic-bezier(.2,.9,.3,1),box-shadow .22s}" +
    ".launcher:hover{transform:translateY(-2px) scale(1.05);box-shadow:0 16px 34px " + alpha(P, .5) + "}" +
    ".launcher:active{transform:scale(.97)}" +
    ".launcher svg{transition:transform .2s}" +

    ".panel{position:fixed;bottom:96px;right:22px;width:386px;max-width:calc(100vw - 32px);height:600px;max-height:calc(100vh - 130px);" +
    "display:none;flex-direction:column;border-radius:20px;overflow:hidden;z-index:2147483000;" +
    "background:" + BG + ";color:" + TXT + ";border:1px solid rgba(255,255,255,.07);" +
    "box-shadow:0 28px 70px rgba(0,0,0,.6),0 4px 14px rgba(0,0,0,.4);transform-origin:bottom right}" +
    ".panel.open{display:flex;animation:pop .3s cubic-bezier(.2,.9,.3,1)}" +
    "@keyframes pop{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}" +

    ".header{display:flex;align-items:center;gap:11px;padding:14px 15px;color:#fff;" +
    "background:" + P + ";background:linear-gradient(165deg," + lighten(P, 8) + "," + darken(P, 16) + ")}" +
    ".ava{width:38px;height:38px;border-radius:50%;flex:none;display:grid;place-items:center;font-weight:700;font-size:15px;" +
    "background:rgba(255,255,255,.18);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}" +
    ".ttl{flex:1;min-width:0}" +
    ".ttl h3{margin:0;font-size:15px;font-weight:700;letter-spacing:-.01em}" +
    ".ttl p{margin:2px 0 0;font-size:11.5px;display:flex;align-items:center;gap:6px;color:rgba(255,255,255,.82)}" +
    ".on{width:7px;height:7px;border-radius:50%;background:#7ef0b6;box-shadow:0 0 0 3px rgba(126,240,182,.22)}" +
    ".talk{flex:none;font-size:11.5px;font-weight:600;color:#fff;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.34);" +
    "border-radius:999px;padding:6px 11px;cursor:pointer;transition:background .15s}" +
    ".talk:hover{background:rgba(0,0,0,.36)}" +

    ".log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:11px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.16) transparent}" +
    ".log::-webkit-scrollbar{width:7px}.log::-webkit-scrollbar-thumb{background:rgba(255,255,255,.16);border-radius:99px}" +

    ".msg{max-width:85%;padding:11px 14px;border-radius:16px;font-size:14px;line-height:1.55;white-space:pre-wrap;word-wrap:break-word;animation:rise .26s ease-out}" +
    "@keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}" +
    ".msg.user{align-self:flex-end;background:" + P + ";color:#fff;border-bottom-right-radius:5px}" +
    ".msg.bot{align-self:flex-start;background:" + lighten(SURF, 3) + ";color:" + TXT + ";border:1px solid rgba(255,255,255,.06);border-bottom-left-radius:5px}" +
    ".msg.note{align-self:center;background:transparent;border:0;font-size:11px;opacity:.55;font-style:italic;max-width:94%;text-align:center;padding:0 4px}" +

    ".cites{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}" +
    ".cite{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;padding:3px 9px;border-radius:999px;" +
    "background:rgba(0,0,0,.28);border:1px solid " + alpha(ACC, .55) + ";color:" + ACC + "}" +
    ".cite::before{content:'';width:7px;height:9px;flex:none;border:1px solid " + ACC + ";border-radius:1px;opacity:.8}" +
    ".badge{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;padding:4px 10px;border-radius:999px;background:" + ACC + ";color:#1a1206;margin-top:10px;font-weight:700}" +

    ".acts{align-self:flex-start;display:flex;flex-wrap:wrap;gap:7px;margin:-1px 0 3px}" +
    ".act{font-size:12px;padding:7px 12px;border-radius:999px;cursor:pointer;border:1px solid rgba(255,255,255,.18);" +
    "background:transparent;color:" + TXT + ";transition:border-color .15s,color .15s,background .15s}" +
    ".act:hover{border-color:" + ACC + ";color:" + ACC + ";background:rgba(0,0,0,.2)}" +

    ".chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 16px 14px}" +
    ".chip{font-size:12px;padding:7px 12px;border-radius:999px;cursor:pointer;border:1px solid rgba(255,255,255,.15);" +
    "background:transparent;color:" + TXT + ";transition:border-color .15s,color .15s}" +
    ".chip:hover{border-color:" + ACC + ";color:" + ACC + "}" +

    ".inputbar{display:flex;align-items:center;gap:9px;padding:12px 13px;border-top:1px solid rgba(255,255,255,.07);background:" + darken(BG, 4) + "}" +
    ".inputbar input{flex:1;padding:12px 14px;border-radius:13px;border:1px solid rgba(255,255,255,.1);" +
    "background:" + lighten(SURF, 2) + ";color:" + TXT + ";font-size:14px;outline:none;transition:border-color .15s}" +
    ".inputbar input::placeholder{color:rgba(255,255,255,.4)}" +
    ".inputbar input:focus{border-color:" + alpha(ACC, .8) + "}" +
    ".inputbar button{flex:none;width:42px;height:42px;border:none;border-radius:50%;cursor:pointer;display:grid;place-items:center;" +
    "background:" + ACC + ";color:#1a1206;transition:transform .15s,opacity .15s}" +
    ".inputbar button:hover{transform:scale(1.06)}" +
    ".inputbar button:disabled{opacity:.45;cursor:default;transform:none}" +

    ".typing{display:inline-flex;gap:4px;padding:2px 0}" +
    ".typing span{width:7px;height:7px;border-radius:50%;background:" + TXT + ";opacity:.5;animation:blink 1.2s infinite}" +
    ".typing span:nth-child(2){animation-delay:.2s}.typing span:nth-child(3){animation-delay:.4s}" +
    "@keyframes blink{0%,60%,100%{opacity:.2}30%{opacity:.95}}" +
    "@media (prefers-reduced-motion: reduce){.panel.open,.msg{animation:none}}";
  root.appendChild(style);

  var CHAT_ICON =
    '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 5.5h16v10H9l-4 3.5v-3.5H4z"/><path d="M8 9.5h8M8 12h5"/></svg>';
  var CLOSE_ICON =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var launcher = document.createElement("button");
  launcher.className = "launcher";
  launcher.setAttribute("aria-label", "Open support chat");
  launcher.innerHTML = CHAT_ICON;
  root.appendChild(launcher);

  var panel = document.createElement("div");
  panel.className = "panel";
  panel.innerHTML =
    '<div class="header">' +
    '<div class="ava">' + initial + "</div>" +
    '<div class="ttl"><h3>' + KB.company.display_name + "</h3>" +
    '<p><span class="on"></span>Virtual assistant · demo</p></div>' +
    '<button class="talk" type="button">Talk to a person</button></div>' +
    '<div class="log" role="log" aria-live="polite"></div>' +
    '<div class="chips"></div>' +
    '<form class="inputbar"><input type="text" placeholder="Type your question…" autocomplete="off" />' +
    '<button type="submit" aria-label="Send">' +
    '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#1a1206" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' +
    "</button></form>";
  root.appendChild(panel);

  var logEl = panel.querySelector(".log");
  var chipsEl = panel.querySelector(".chips");
  var form = panel.querySelector("form");
  var input = panel.querySelector("input");
  var sendBtn = panel.querySelector("button[type=submit]");
  var talkBtn = panel.querySelector(".talk");

  var SUGGESTIONS = [
    "What's your return policy?",
    "How much is shipping?",
    "How do I file a warranty claim?",
    "Where's my order?",
  ];

  var state = { lastIntent: null, escalated: false, greeted: false };

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function addMessage(role, text, opts) {
    opts = opts || {};
    var el = document.createElement("div");
    el.className = "msg " + role;
    el.innerHTML = esc(text);
    if (opts.citations && opts.citations.length) {
      var wrap = document.createElement("div");
      wrap.className = "cites";
      opts.citations.forEach(function (src) {
        var chip = document.createElement("span");
        chip.className = "cite";
        chip.textContent = src;
        wrap.appendChild(chip);
      });
      el.appendChild(wrap);
    }
    if (opts.escalate) {
      var b = document.createElement("div");
      b.className = "badge";
      b.textContent = "Bringing in a human";
      el.appendChild(b);
    }
    logEl.appendChild(el);
    logEl.scrollTop = logEl.scrollHeight;
    return el;
  }

  function addActions(actions) {
    var row = document.createElement("div");
    row.className = "acts";
    actions.forEach(function (a) {
      var btn = document.createElement("button");
      btn.className = "act";
      btn.type = "button";
      btn.textContent = a.label;
      btn.addEventListener("click", function () { row.remove(); a.run(); });
      row.appendChild(btn);
    });
    logEl.appendChild(row);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function addTyping() {
    var el = document.createElement("div");
    el.className = "msg bot";
    el.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
    logEl.appendChild(el);
    logEl.scrollTop = logEl.scrollHeight;
    return el;
  }

  function normalize(s) {
    return " " + String(s).toLowerCase().replace(/[^a-z0-9$\s]/g, " ").replace(/\s+/g, " ") + " ";
  }

  function contactLine() {
    return " You can also reach the team directly at " + CONTACT.phone + " or " + CONTACT.email + " (" + CONTACT.hours + ").";
  }

  function resolve(message) {
    var q = normalize(message);
    var i, k;

    for (i = 0; i < KB.frustrationTriggers.length; i++) {
      if (q.indexOf(KB.frustrationTriggers[i]) !== -1) {
        return {
          kind: "frustration",
          answer: "I'm sorry, that sounds genuinely frustrating, and I don't want to make you keep typing at a bot. Let me get a person on it now. I'm handing them this whole conversation so you won't have to repeat anything." + contactLine(),
          citations: [], escalate: true,
        };
      }
    }
    for (i = 0; i < KB.escalationTriggers.length; i++) {
      if (q.indexOf(KB.escalationTriggers[i]) !== -1) {
        return {
          kind: "escalate",
          answer: KB.company.escalation.message + contactLine(),
          citations: ["contact-and-hours.md"], escalate: true,
        };
      }
    }
    for (i = 0; i < KB.outOfScope.length; i++) {
      for (k = 0; k < KB.outOfScope[i].kw.length; k++) {
        if (q.indexOf(KB.outOfScope[i].kw[k]) !== -1) {
          return {
            kind: "oos",
            answer: "That's a little outside what I can help with here (" + KB.outOfScope[i].topic +
              "), so I won't guess. The team can sort it out directly at " + CONTACT.email + ".",
            citations: [], escalate: false,
          };
        }
      }
    }
    var best = null, bestScore = 0;
    KB.intents.forEach(function (intent) {
      var score = 0;
      intent.keywords.forEach(function (kw) {
        if (q.indexOf(kw) !== -1) score += kw.split(" ").length * 2;
      });
      intent.keywords.forEach(function (kw) {
        kw.split(" ").forEach(function (tok) {
          if (tok.length > 3 && q.indexOf(" " + tok) !== -1) score += 0.5;
        });
      });
      if (score > bestScore) { bestScore = score; best = intent; }
    });
    if (best && bestScore >= 1) {
      return { kind: "intent", intentId: best.id, answer: best.answer, citations: [best.source], escalate: false };
    }
    return {
      kind: "fallback",
      answer: "I'm not certain I have an article on that, and I'd rather not guess. I can help with orders and tracking, shipping, returns and refunds, gear care and sizing, warranties, and account help. Want me to get a person instead?",
      citations: [], escalate: false,
    };
  }

  function escalateNow(prefix) {
    if (state.escalated) {
      addMessage("bot", "You're already in line for a teammate. They'll have the full thread, so there's no need to repeat yourself.");
      return;
    }
    state.escalated = true;
    var msg = (prefix ? prefix + " " : "") + KB.company.escalation.message + contactLine();
    var t = addTyping();
    setTimeout(function () {
      t.remove();
      addMessage("bot", msg, { escalate: true, citations: ["contact-and-hours.md"] });
    }, 360);
  }

  function offerResolution() {
    addActions([
      { label: "Yes, that's sorted", run: function () { addMessage("bot", "Glad that did it. Anything else I can pull up for you?"); } },
      { label: "Still stuck", run: function () { escalateNow("Sorry that didn't fully sort it."); } },
      { label: "Talk to a person", run: function () { escalateNow(null); } },
    ]);
  }

  function send(text) {
    text = (text || input.value).trim();
    if (!text) return;
    addMessage("user", text);
    input.value = "";
    input.disabled = true; sendBtn.disabled = true;
    chipsEl.style.display = "none";
    var typing = addTyping();

    var res = resolve(text);
    var repeat = res.kind === "intent" && res.intentId === state.lastIntent;

    setTimeout(function () {
      typing.remove();
      if (repeat) {
        state.escalated = true;
        addMessage("bot", "That clearly didn't fully answer it, and I don't want to send you in circles. Let me get a person, with the whole conversation so you won't repeat yourself." + contactLine(), { escalate: true, citations: ["contact-and-hours.md"] });
      } else {
        addMessage("bot", res.answer, { citations: res.citations, escalate: res.escalate });
        if (res.kind === "intent") {
          addMessage("note", "answered from Northwind's help articles, grounded retrieval");
          state.lastIntent = res.intentId;
          offerResolution();
        } else if (res.kind === "fallback") {
          addActions([{ label: "Talk to a person", run: function () { escalateNow(null); } }]);
        } else if (res.kind === "escalate" || res.kind === "frustration") {
          state.escalated = true;
        }
      }
      input.disabled = false; sendBtn.disabled = false; input.focus();
    }, 460);
  }

  function renderChips() {
    chipsEl.innerHTML = "";
    chipsEl.style.display = "flex";
    SUGGESTIONS.forEach(function (s) {
      var c = document.createElement("button");
      c.className = "chip";
      c.type = "button";
      c.textContent = s;
      c.addEventListener("click", function () { send(s); });
      chipsEl.appendChild(c);
    });
  }

  function setOpen(open) {
    if (open) {
      panel.classList.add("open");
      launcher.innerHTML = CLOSE_ICON;
      launcher.setAttribute("aria-label", "Close support chat");
      input.focus();
      if (!state.greeted) {
        addMessage("bot", KB.company.greeting);
        renderChips();
        state.greeted = true;
      }
    } else {
      panel.classList.remove("open");
      launcher.innerHTML = CHAT_ICON;
      launcher.setAttribute("aria-label", "Open support chat");
    }
  }

  launcher.addEventListener("click", function () { setOpen(!panel.classList.contains("open")); });
  talkBtn.addEventListener("click", function () { escalateNow(null); });
  form.addEventListener("submit", function (e) { e.preventDefault(); send(); });

  window.openSupportDemo = function () { setOpen(true); };

  // ── tiny color helpers (keep the widget themable from company colors) ─────
  function lighten(hex, pct) { return mix(hex, "#ffffff", pct); }
  function darken(hex, pct) { return mix(hex, "#000000", pct); }
  function alpha(hex, a) { var c = parse(hex); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function mix(hex, tgt, pct) {
    var a = parse(hex), b = parse(tgt), t = pct / 100;
    var r = Math.round(a[0] + (b[0] - a[0]) * t),
      g = Math.round(a[1] + (b[1] - a[1]) * t),
      bl = Math.round(a[2] + (b[2] - a[2]) * t);
    return "rgb(" + r + "," + g + "," + bl + ")";
  }
  function parse(hex) {
    hex = hex.replace("#", "");
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
})();
