"use strict";
// The widget's model step: requestModelAnswer must always come back with
// something true to show. Any failure returns the best retrieved passage.
const test = require("node:test");
const assert = require("node:assert/strict");
const { core, loadIndex } = require("./helpers.js");

const passages = core.search(loadIndex(), "how long does a refund take", 3).map((h) => h.passage);
const best = passages[0];

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function assertArticleFallback(result, reason) {
  assert.equal(result.mode, "article");
  assert.equal(result.reason, reason);
  assert.equal(result.answer, best.text, "shows the passage text itself");
  assert.deepEqual(result.sources, [{ id: best.id, article: best.article, section: best.section }]);
  assert.equal(result.sources[0].article, "Returns and Exchanges");
}

test("network error falls back to the passage", async () => {
  const result = await core.requestModelAnswer(async () => { throw new Error("offline"); }, "api/answer", "q", passages);
  assertArticleFallback(result, "network");
});

test("static host with no function (404) falls back to the passage", async () => {
  const result = await core.requestModelAnswer(async () => jsonResponse(404, {}), "api/answer", "q", passages);
  assertArticleFallback(result, "http-404");
});

test("model switched off falls back to the passage", async () => {
  const result = await core.requestModelAnswer(async () => jsonResponse(200, { mode: "off", reason: "disabled" }), "api/answer", "q", passages);
  assertArticleFallback(result, "disabled");
});

test("guard rejection falls back to the passage", async () => {
  const result = await core.requestModelAnswer(async () => jsonResponse(200, { mode: "fallback", reason: "ungrounded" }), "api/answer", "q", passages);
  assertArticleFallback(result, "ungrounded");
});

test("rate limited (429) falls back to the passage", async () => {
  const result = await core.requestModelAnswer(async () => jsonResponse(429, { mode: "limited" }), "api/answer", "q", passages);
  assertArticleFallback(result, "http-429");
});

test("a hung request times out and falls back", async () => {
  const hang = (url, opts) => new Promise((_, reject) => {
    opts.signal.addEventListener("abort", () => reject(new Error("aborted")));
  });
  const result = await core.requestModelAnswer(hang, "api/answer", "q", passages, 30);
  assertArticleFallback(result, "network");
});

test("a model answer passes through with its source", async () => {
  let sent;
  const fetchMock = async (url, opts) => {
    sent = { url, body: JSON.parse(opts.body) };
    return jsonResponse(200, { mode: "model", answer: "About 2 to 3 business days.", sources: [{ id: best.id, article: best.article, section: best.section }] });
  };
  const result = await core.requestModelAnswer(fetchMock, "api/answer", "how long does a refund take", passages);
  assert.equal(result.mode, "model");
  assert.equal(result.answer, "About 2 to 3 business days.");
  assert.equal(result.sources[0].id, best.id);
  assert.equal(result.passage, best, "the widget can show the passage used");
  assert.equal(sent.url, "api/answer");
  assert.deepEqual(sent.body.passageIds, passages.map((p) => p.id), "sends passage ids, not passage text");
});

test("handoff summary carries the transcript and detected topic", () => {
  const summary = core.buildHandoffSummary(
    [
      { role: "customer", text: "how long does a refund take" },
      { role: "assistant", text: "About 2 to 3 business days." },
      { role: "customer", text: "it has been two weeks" },
    ],
    "Returns and Exchanges",
    "customer asked for a person",
  );
  assert.match(summary, /^Reason for handoff: customer asked for a person$/m);
  assert.match(summary, /^Topic: Returns and Exchanges$/m);
  assert.match(summary, /^Customer messages: 2$/m);
  assert.match(summary, /^Customer: how long does a refund take$/m);
  assert.match(summary, /^Assistant: About 2 to 3 business days\.$/m);
  assert.match(summary, /^Customer: it has been two weeks$/m);
});
