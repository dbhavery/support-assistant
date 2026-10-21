"use strict";
// Shared test setup: load the six help articles from /kb the same way the
// widget and the serverless function do.
const fs = require("fs");
const path = require("path");
const core = require("../assets/core.js");
const KB = require("../assets/kb.js");

const KB_DIR = path.join(__dirname, "..", "kb");

function loadArticles() {
  return KB.articles.map((file) => core.parseArticle(file, fs.readFileSync(path.join(KB_DIR, file), "utf8")));
}

function loadIndex() {
  return core.buildIndex(loadArticles());
}

module.exports = { core, KB, loadArticles, loadIndex };
