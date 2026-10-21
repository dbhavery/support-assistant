"use strict";
// api/answer.js with the Anthropic call mocked. No network, no key.
const test = require("node:test");
const assert = require("node:assert/strict");
const answer = require("../api/answer.js");

const { createHandler, _internal } = answer;
const REFUND = "returns-policy#refund-timing";
const WINDOW = "returns-policy#return-window";
const ON = { ASSISTANT_MODEL_ENABLED: "true", ANTHROPIC_API_KEY: "test-key" };

function call(handler, body, opts = {}) {
  return new Promise((resolve) => {
    const req = {
      method: opts.method || "POST",
      headers: { "x-forwarded-for": opts.ip || "203.0.113.7" },
      body,
    };
    const res = {
      statusCode: 0,
      headers: {},
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      end(data) { resolve({ status: this.statusCode, body: JSON.parse(data), headers: this.headers }); },
    };
    handler(req, res);
  });
}

// A stand-in for the Messages API that records what it was sent.
function mockClaude(replyText, status = 200) {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts, body: JSON.parse(opts.body) });
    return {
      ok: status === 200,
      status,
      json: async () => ({
        stop_reason: "end_turn",
        content: [{ type: "thinking", thinking: "" }, { type: "text", text: replyText }],
      }),
    };
  };
  return { fetchImpl, calls };
}

test.beforeEach(() => _internal.resetLimits());

test("kill switch unset: returns mode off and never calls the model", async () => {
  const m = mockClaude("SOURCE: x\nANSWER: y");
  const h = createHandler({ env: { ANTHROPIC_API_KEY: "test-key" }, fetch: m.fetchImpl });
  const r = await call(h, { question: "how long does a refund take", passageIds: [REFUND] });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { mode: "off", reason: "disabled" });
  assert.equal(m.calls.length, 0);
});

test("kill switch set to anything but \"true\" stays off", async () => {
  const m = mockClaude("SOURCE: x\nANSWER: y");
  const h = createHandler({ env: { ASSISTANT_MODEL_ENABLED: "yes", ANTHROPIC_API_KEY: "k" }, fetch: m.fetchImpl });
  const r = await call(h, { question: "refund", passageIds: [REFUND] });
  assert.equal(r.body.mode, "off");
  assert.equal(m.calls.length, 0);
});

test("key missing: returns mode off and never calls the model", async () => {
  const m = mockClaude("SOURCE: x\nANSWER: y");
  const h = createHandler({ env: { ASSISTANT_MODEL_ENABLED: "true" }, fetch: m.fetchImpl });
  const r = await call(h, { question: "refund", passageIds: [REFUND] });
  assert.deepEqual(r.body, { mode: "off", reason: "no-key" });
  assert.equal(m.calls.length, 0);
});

test("model on: sends a grounded request with the guards in place", async () => {
  const m = mockClaude(`SOURCE: ${REFUND}\nANSWER: After we receive and inspect your return, usually 2 to 3 business days, we issue the refund. It posts within 5 to 7 business days.`);
  const h = createHandler({ env: ON, fetch: m.fetchImpl });
  const r = await call(h, { question: "how long does a refund take", passageIds: [REFUND, WINDOW] });

  assert.equal(r.status, 200);
  assert.equal(r.body.mode, "model");
  assert.match(r.body.answer, /5 to 7 business days/);
  assert.deepEqual(r.body.sources, [{ id: REFUND, article: "Returns and Exchanges", section: "Refund timing" }]);

  assert.equal(m.calls.length, 1);
  const { url, opts, body } = m.calls[0];
  assert.equal(url, "https://api.anthropic.com/v1/messages");
  assert.equal(opts.headers["x-api-key"], "test-key");
  assert.equal(opts.headers["anthropic-version"], "2023-06-01");
  assert.equal(body.model, "claude-haiku-5-5");
  assert.equal(body.max_tokens, 300);
  assert.match(body.system, /ONLY the help article passages/);
  const user = body.messages[0].content;
  assert.match(user, /<passage id="returns-policy#refund-timing"/);
  assert.match(user, /<passage id="returns-policy#return-window"/);
  assert.match(user, /<question>\nhow long does a refund take\n<\/question>/);
});

test("guard: an answer with a figure not in the passages is rejected", async () => {
  const m = mockClaude(`SOURCE: ${REFUND}\nANSWER: Refunds arrive within 48 hours.`);
  const h = createHandler({ env: ON, fetch: m.fetchImpl });
  const r = await call(h, { question: "how long does a refund take", passageIds: [REFUND] });
  assert.equal(r.body.mode, "fallback");
  assert.equal(r.body.reason, "ungrounded");
  assert.deepEqual(r.body.detail, ["num:48"]);
});

test("guard: an invented email address is rejected", async () => {
  const m = mockClaude(`SOURCE: ${REFUND}\nANSWER: Email refunds@northwind.example.com and we will help.`);
  const h = createHandler({ env: ON, fetch: m.fetchImpl });
  const r = await call(h, { question: "refund", passageIds: [REFUND] });
  assert.equal(r.body.reason, "ungrounded");
});

test("guard: a cited passage that was not supplied is rejected", async () => {
  const m = mockClaude("SOURCE: warranty#the-northwind-promise\nANSWER: It is covered.");
  const h = createHandler({ env: ON, fetch: m.fetchImpl });
  const r = await call(h, { question: "refund", passageIds: [REFUND] });
  assert.deepEqual(r.body, { mode: "fallback", reason: "bad-source" });
});

test("guard: a reply in the wrong format falls back", async () => {
  const m = mockClaude("Sure! Refunds take a few days.");
  const h = createHandler({ env: ON, fetch: m.fetchImpl });
  const r = await call(h, { question: "refund", passageIds: [REFUND] });
  assert.deepEqual(r.body, { mode: "fallback", reason: "format" });
});

test("SOURCE: NONE becomes an honest \"I don't know\"", async () => {
  const m = mockClaude("SOURCE: NONE\nANSWER: I don't know that from our help articles. A person on the team can help.");
  const h = createHandler({ env: ON, fetch: m.fetchImpl });
  const r = await call(h, { question: "do you sell kayaks", passageIds: [REFUND] });
  assert.equal(r.body.mode, "unknown");
  assert.match(r.body.answer, /don't know/);
});

test("dashes in the model's answer are replaced", async () => {
  const dash = String.fromCharCode(0x2013);
  const m = mockClaude(`SOURCE: ${REFUND}\nANSWER: Inspection takes 2${dash}3 business days.`);
  const h = createHandler({ env: ON, fetch: m.fetchImpl });
  const r = await call(h, { question: "refund", passageIds: [REFUND] });
  assert.equal(r.body.answer, "Inspection takes 2 to 3 business days.");
});

test("upstream error or network failure falls back", async () => {
  const bad = mockClaude("", 500);
  let r = await call(createHandler({ env: ON, fetch: bad.fetchImpl }), { question: "refund", passageIds: [REFUND] });
  assert.deepEqual(r.body, { mode: "fallback", reason: "upstream" });

  const thrower = async () => { throw new Error("ECONNRESET"); };
  r = await call(createHandler({ env: ON, fetch: thrower }), { question: "refund", passageIds: [REFUND] });
  assert.deepEqual(r.body, { mode: "fallback", reason: "upstream" });
});

test("input limits: method, empty, too long, unknown or too many passages", async () => {
  const m = mockClaude("SOURCE: x\nANSWER: y");
  const h = createHandler({ env: ON, fetch: m.fetchImpl });
  assert.equal((await call(h, {}, { method: "GET" })).status, 405);
  assert.equal((await call(h, { question: "  ", passageIds: [REFUND] })).status, 400);
  assert.equal((await call(h, { question: "x".repeat(_internal.MAX_QUESTION_CHARS + 1), passageIds: [REFUND] })).status, 400);
  assert.equal((await call(h, { question: "refund", passageIds: ["made-up#section"] })).status, 400);
  assert.equal((await call(h, { question: "refund", passageIds: [REFUND, WINDOW, REFUND, WINDOW] })).status, 400);
  assert.equal((await call(h, { question: "refund" })).status, 400);
  assert.equal((await call(h, "not json")).status, 400);
  assert.equal(m.calls.length, 0, "no bad request reaches the model");
});

test("per-IP rate limit returns 429 after the limit", async () => {
  const m = mockClaude(`SOURCE: ${REFUND}\nANSWER: We issue the refund after inspection.`);
  const h = createHandler({ env: ON, fetch: m.fetchImpl, now: () => 1800000000000 });
  for (let i = 0; i < _internal.PER_IP_LIMIT; i++) {
    const r = await call(h, { question: "refund", passageIds: [REFUND] });
    assert.equal(r.body.mode, "model");
  }
  const blocked = await call(h, { question: "refund", passageIds: [REFUND] });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.mode, "limited");
  const other = await call(h, { question: "refund", passageIds: [REFUND] }, { ip: "198.51.100.9" });
  assert.equal(other.body.mode, "model", "a different IP is not blocked");
  assert.equal(m.calls.length, _internal.PER_IP_LIMIT + 1);
});

test("daily cap returns 429 once reached, across IPs", async () => {
  const m = mockClaude(`SOURCE: ${REFUND}\nANSWER: We issue the refund after inspection.`);
  const h = createHandler({ env: { ...ON, ASSISTANT_DAILY_CAP: "2" }, fetch: m.fetchImpl, now: () => 1800000000000 });
  assert.equal((await call(h, { question: "refund", passageIds: [REFUND] }, { ip: "a" })).body.mode, "model");
  assert.equal((await call(h, { question: "refund", passageIds: [REFUND] }, { ip: "b" })).body.mode, "model");
  const r = await call(h, { question: "refund", passageIds: [REFUND] }, { ip: "c" });
  assert.equal(r.status, 429);
  assert.equal(m.calls.length, 2);
});

test("fact extraction reads numbers, number words, emails and phones", () => {
  const f = _internal.extractFacts("Call 1-800-555-0142 or email a@b.example.com. $6.95, 20,000mm, sixty days");
  assert.ok(f.includes("phone:1-800-555-0142"));
  assert.ok(f.includes("email:a@b.example.com"));
  assert.ok(f.includes("num:6.95"));
  assert.ok(f.includes("num:20000"));
  assert.ok(f.includes("num:60"));
  assert.ok(!f.includes("num:800"), "phone digits are not read as loose numbers");
});
