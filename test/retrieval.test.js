"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { core, KB, loadArticles, loadIndex } = require("./helpers.js");

test("every listed article exists and splits into titled sections", () => {
  const articles = loadArticles();
  assert.equal(articles.length, KB.articles.length);
  for (const a of articles) {
    assert.ok(a.passages.length >= 3, `${a.id} has sections`);
    assert.notEqual(a.title, a.id, `${a.id} has an H1 title`);
    for (const p of a.passages) {
      assert.match(p.id, /^[a-z-]+#[a-z0-9-]+$/);
      assert.ok(p.text.length > 20);
      assert.doesNotMatch(p.text, /\*\*/, "markdown bold is stripped");
    }
  }
});

test("passage ids are unique", () => {
  const ids = loadArticles().flatMap((a) => a.passages.map((p) => p.id));
  assert.equal(new Set(ids).size, ids.length);
});

// Question -> the section a support agent would point to.
const CASES = [
  ["What's your return policy?", "returns-policy#return-window"],
  ["How much is shipping?", "shipping-policy#shipping-options-and-costs"],
  ["how much is overnight shipping", "shipping-policy#shipping-options-and-costs"],
  ["How do I file a warranty claim?", "warranty#how-to-file-a-warranty-claim"],
  ["Where's my order?", "shipping-policy#tracking-your-order"],
  ["how long does a refund take", "returns-policy#refund-timing"],
  ["I forgot my password", "account-and-orders#managing-your-account"],
  ["how do I wash my rain jacket", "product-faq#materials-and-care"],
  ["do your boots run large", "product-faq#sizing"],
  ["when are you open on saturday", "contact-and-hours#support-hours"],
  ["can I cancel my order", "account-and-orders#changing-or-canceling-an-order"],
  ["do gift cards expire", "product-faq#gift-cards"],
];

for (const [question, expected] of CASES) {
  test(`ranks ${expected} first for "${question}"`, () => {
    const hits = core.search(loadIndex(), question, 3);
    assert.ok(hits.length > 0, "has results");
    assert.equal(hits[0].passage.id, expected);
    assert.ok(hits[0].score >= core.MIN_SCORE, `score ${hits[0].score} clears MIN_SCORE`);
  });
}

test("results come back best first and capped at the limit", () => {
  const hits = core.search(loadIndex(), "return shipping refund label", 3);
  assert.equal(hits.length, 3);
  for (let i = 1; i < hits.length; i++) assert.ok(hits[i - 1].score >= hits[i].score);
});

for (const question of ["what is the capital of france", "tell me a joke", "do you sell bikes", "what's the weather"]) {
  test(`off-topic question "${question}" stays under MIN_SCORE`, () => {
    const hits = core.search(loadIndex(), question, 3);
    assert.ok(!hits.length || hits[0].score < core.MIN_SCORE, JSON.stringify(hits[0] && hits[0].score));
  });
}

test("hard line wraps are joined so passages reflow in the chat panel", () => {
  const p = loadIndex().byId["returns-policy#refund-timing"];
  assert.match(p.text, /Refunds post to your original payment method within 5 to 7 business days after that\./);
  const steps = loadIndex().byId["returns-policy#how-to-start-a-return"].text;
  assert.match(steps, /\n2\. Choose Start a Return/, "numbered steps stay on their own lines");
});
