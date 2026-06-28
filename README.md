# Customer Support Assistant

A per-company AI customer-support assistant: it answers from a company's own help
documents, footnotes every source, speaks in the company's voice, and hands off to a
human the moment one is needed, with the whole conversation attached so the customer
never repeats themselves.

**Live demo → [support.dbhavery.ai](https://support.dbhavery.ai)**

Ask it a real question, push back, or tell it you're frustrated and want a person.

## What this repo is

This is the **public showcase** for the project: a static, always-on case study with a
working chat widget. The widget's answers come from client-side retrieval over a sample
company's real help articles, with each source cited. **Nothing runs on a server or a
GPU** — it's plain HTML/CSS/JS. The full per-company RAG service (the application this
showcases) is a separate codebase.

```
index.html        the case-study page (editorial, no build step)
assets/kb.js      the sample company's grounded knowledge base + escalation rules
assets/widget.js  the embeddable Shadow-DOM chat widget (self-contained)
assets/app.js     page motion + the self-playing sample transcript
RESEARCH.md       the customer-service research the product + copy are built on
og.html / og.png  the social share card
```

## How the real product works

The architecture is the product; the model is a config line.

1. **Read the company profile** — one `company.yaml` declares branding, scope,
   escalation rules, and which documents to ground in.
2. **Retrieve** the relevant help article (ChromaDB + embeddings over the company's docs).
3. **Answer, and cite it** — composed only from the retrieved policy, with the source
   attached.
4. **Confirm it's resolved**, and **hand off to a human** with full context on
   frustration, a repeat, or a high-stakes case.

It is model-agnostic: run it on a frontier model (Claude, GPT, Gemini) for top quality,
or on self-hosted open models (Llama, Qwen, Mistral) for fully private, regulated work.

See [RESEARCH.md](RESEARCH.md) for the customer-service research behind the behavior and
the copy.

## Run it locally

No build step. Serve the folder:

```bash
python -m http.server 8000
# open http://localhost:8000
```

## Credits

Built by **Donald B. Havery** — Applied AI / AI Systems Engineer.
[dbhavery.ai](https://dbhavery.ai) · [github.com/dbhavery](https://github.com/dbhavery)

Sample company data ("Northwind Outdoors") is invented for the demo.

## License

MIT — see [LICENSE](LICENSE).
