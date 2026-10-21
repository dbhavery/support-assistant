"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { core, KB } = require("./helpers.js");

test('"again" matches as a word but not inside "against"', () => {
  assert.equal(core.matchPhrase("it broke again", "again"), true);
  assert.equal(core.matchPhrase("Again?!", "again"), true);
  assert.equal(core.matchPhrase("is there a charge against my card", "again"), false);
});

test("a question containing \"against\" is answered, not escalated as frustration", () => {
  const c = core.classifyMessage("Does the warranty protect against zipper failure?", KB);
  assert.equal(c.kind, "question");
});

test("a message containing \"again\" is read as frustration", () => {
  const c = core.classifyMessage("my jacket leaked again", KB);
  assert.equal(c.kind, "frustration");
  assert.equal(c.trigger, "again");
});

test('"agent" does not fire on "agency" or "agents"', () => {
  assert.equal(core.classifyMessage("which shipping agency do you use", KB).kind, "question");
  assert.equal(core.classifyMessage("let me talk to an agent", KB).kind, "escalate");
});

test("multi-word and $ triggers match whole phrases", () => {
  assert.equal(core.classifyMessage("I need a refund over $300 for a tent", KB).kind, "escalate");
  assert.equal(core.classifyMessage("my package is lost", KB).kind, "escalate");
  assert.equal(core.classifyMessage("do you offer bulk pricing", KB).kind, "oos");
});

test("frustration is checked before escalation", () => {
  const c = core.classifyMessage("this is ridiculous, get me a real person", KB);
  assert.equal(c.kind, "frustration");
});
