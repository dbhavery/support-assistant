# Customer Support Assistant

A chat widget that answers customer questions from a company's help articles, names the article it used, and offers a person when the customer is frustrated, repeats a question, or raises a high-stakes issue.

Live demo: https://support.dbhavery.ai

**What is real in this demo.** Retrieval runs in your browser: the widget loads six help articles from `kb/` and ranks their sections with BM25. The model step runs only when the site operator turns it on and supplies an Anthropic API key; it is off by default. When it is off, or the call fails, the widget shows the retrieved help article section directly, names the article and section, and says that it is doing so. The handoff to a person shows the summary a teammate would receive. The demo has no inbox, so nothing is sent anywhere. The company, "Northwind Outdoors", is invented.

## The problem

A customer with a question about a return, a late package or a broken zipper often meets a support bot that guesses, repeats itself, or hides the way to a person. When they do reach a person, they have to explain everything again. A wrong answer about a refund window or a price is worse than no answer.

## How it solves it

- **Answers come from the help articles.** Each question is matched against the sections of the company's help articles. The widget shows the section it used and names the article. If no section matches well enough, it says it does not have an article on that and offers a person instead of guessing.
- **An optional model step writes a short answer from those sections only.** Claude is given the question and the top three sections and told to answer only from them and to say it does not know otherwise. Before the answer is shown, a check rejects it if it contains a number, email address, phone number or link that does not appear in those sections, or if it cites a section it was not given. A rejected answer is replaced by the section itself.
- **It offers a person early.** Frustrated wording, a request for a person, high-stakes topics (a lost package, a refund over $300, a chargeback, legal matters) and a repeated question all lead to a handoff. Each answer from an article ends by asking whether the problem is solved.
- **The handoff includes the conversation.** "Talk to a person" builds a summary with the reason for the handoff, the detected topic (the article of the last answer) and the full transcript, and shows it to the customer as what a teammate would receive.

## Who it helps

- Online stores that want a support widget that answers from their policies and shows where each answer came from.
- Support leads who want routine questions answered and hard ones handed to a person with the context attached.
- Anyone evaluating how to add a model to a support flow with limits on what it can say and what it can cost.

## Technical details

**Stack.** Plain HTML, CSS and JavaScript in the browser, with no build step and no dependencies. One Vercel serverless function in Node (`api/answer.js`) calls the Anthropic Messages API with `fetch`. Tests use the built-in `node:test` runner.

```
index.html          the case-study page
kb/*.md             the six help articles (returns, shipping, warranty, account and orders, product FAQ, contact and hours)
assets/core.js      article parsing, BM25 ranking, trigger matching, the model request with fallback, the handoff summary
assets/kb.js        the sample company: name, colors, contact details, triggers, list of articles
assets/widget.js    the chat widget (Shadow DOM)
assets/app.js       page motion and the self-playing example transcript
api/answer.js       POST /api/answer: the guarded Claude call
test/*.test.js      tests
RESEARCH.md         the customer-service research the behavior is based on
```

**How a question is handled.**

1. `classifyMessage` checks the message for frustration, a request for a person, a high-stakes topic, or an out-of-scope topic (wholesale pricing, card numbers). Triggers match whole words only, so "again" does not match "against" and "agent" does not match "agency".
2. `search` ranks every `##` section of every article with BM25. Section headings, article titles and file names count extra. A short list of query synonyms maps words like "much" to "cost" and "open" to "hour". If the best score is under `MIN_SCORE`, the widget says it has no article for that.
3. If the best section is the same one it answered last time, the answer did not help, so the widget hands off to a person.
4. The widget sends the question and the ids of the top three sections to `/api/answer`. The function looks the ids up in the server's copy of `kb/` and never accepts passage text from the browser, so it cannot be used as a general model proxy.
5. If the function returns anything other than a checked answer (model off, no key, rate limited, network error, guard rejection), the widget shows the best section itself.

**The serverless function.** `api/answer.js` calls model `claude-haiku-5-5` with `max_tokens` 300 and low effort. Its limits:

| Limit | Value |
|---|---|
| Kill switch | `ASSISTANT_MODEL_ENABLED` must be exactly `true`; off when unset |
| API key | `ANTHROPIC_API_KEY`; off when unset |
| Question length | 500 characters |
| Passages per request | 1 to 3, by id only |
| Output | 300 tokens |
| Per-IP rate limit | 10 requests per 10 minutes |
| Daily cap | `ASSISTANT_DAILY_CAP` model calls per instance per UTC day, default 200 |
| Upstream timeout | 15 seconds |

The rate limit and the daily cap are kept in the memory of each serverless instance, so the real ceiling is the number of instances times these values. Set a spend limit on the Anthropic account as the hard stop.

**Turning on the model step.** In the Vercel project settings, set `ANTHROPIC_API_KEY` to your key and `ASSISTANT_MODEL_ENABLED` to `true`, optionally set `ASSISTANT_DAILY_CAP`, then redeploy. Remove either variable to turn it off again.

**Run it locally.**

```bash
git clone https://github.com/dbhavery/support-assistant
cd support-assistant
python -m http.server 8000
# open http://localhost:8000
```

A static server has no `/api/answer`, so the widget shows the retrieved sections directly.

**Test.**

```bash
npm test
```

Requires Node 22 or newer. The tests check that each sample question ranks the expected article section first and that off-topic questions stay under the score threshold; that "again" no longer matches "against" and that other triggers match whole words; that every failure path in the widget's model request (network error, 404, 429, model off, guard rejection, timeout) falls back to the passage with its article and section; that the handoff summary includes the transcript and topic; and, with the Anthropic call mocked, that the function stays off without the kill switch or key, sends the expected model, token limit and passages, rejects answers with figures, emails or sources that are not in the passages, and enforces the input limits, the per-IP rate limit and the daily cap. GitHub Actions runs them on every push to `main` and on pull requests.

## Credits

Built by Donald B. Havery. https://dbhavery.ai

## License

MIT. See [LICENSE](LICENSE).
