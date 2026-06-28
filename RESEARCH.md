# Customer-support research → how this showcase applies it

Web research (2024-2026 sources: Zendesk CX Trends, Salesforce State of Service, Gartner, McKinsey, Forrester, PwC, Bain, Intercom, Ada, COPC, Help Scout, HBR). Done 2026-06-27 before reworking the showcase, so the page and the assistant's behavior reflect real CX practice, not assumptions.

## What customers actually want (ranked)
1. **Fast resolution on the first contact.** Speed is the #1 ranked factor; 85% of CX leaders say customers leave a brand that can't resolve on first contact. FCR is now table stakes (industry avg ~70%).
2. **Don't make me repeat myself.** 86% want context carried across the conversation; repeating info on handoff rates the experience ~76% worse and is the biggest driver of "AI hatred." Context loss on AI→human handoff is the single most common failure point.
3. **An easy, early path to a human.** 80% expect to reach a human; 81% expect a bot to escalate when needed but only 38% say it reliably does; patience for automation runs out in ~3 minutes. Don't bury "talk to a person."
4. **Know it's AI (transparency).** Telling customers they're talking to AI raised satisfaction 34 points (COPC). 14% lose trust if a bot hides that it's AI.
5. **Low effort + accuracy.** Reducing customer effort predicts loyalty better than "delight." Bots that don't understand / loop are the #1 2025 frustration. 17% leave after one bad experience, 59% after several.

## What the business needs (goals + KPIs)
- **Resolution, not deflection.** Deflection (avoided a human) ≠ containment/resolution (issue actually fixed). A deflected ticket that returns twice is a fake saving. Track FCR + CSAT + containment together.
- **KPIs:** FCR (top CSAT predictor), CSAT, CES (effort), NPS, AHT (efficiency only), deflection/containment, **cost per resolution** (AI ~$0.62 vs human ~$7.40; ~10-20x unit-economics gap), retention/churn (5% retention lift → 25-95% profit, Bain).
- **Plan to get there:** self-service first (81% try to self-solve), ground answers in a curated KB, automate repetitive high-structure intents (password/order/returns deflect 50-70%+), route complex/emotional to humans, QA + a learning loop that closes KB gaps from escalation patterns.
- **Risks they fear:** hallucinated answers (live bots hallucinate 15-27%; one fake policy/price can break trust), brand/compliance damage, data privacy, customers hating bots (Klarna reversed AI-heavy support in 2025 after CSAT dropped).

## How AI should ACT (and work with humans)
- Disclose it's a virtual assistant, upfront.
- **Resolve, don't deflect.** Optimize for fixing it on first contact; speed alone left 75% still frustrated.
- **Never make them repeat themselves** — carry context in-session and pass the full transcript + what was tried to the human on escalation.
- **Easy, early human exit** — auto-escalate on frustration, repeated questions, or a sentiment drop, before the customer has to demand it.
- Be fast and concise; frame positively and set expectations ("Your replacement ships tomorrow").
- Specific empathy ("I can see why that's frustrating"), but competence leads.
- Be honest about limits; route rather than bluff or loop.
- Human-in-the-loop: confidence-gated auto-resolve, graceful handoff with full context, agent-assist (AI drafts, human approves), human accountable for high-stakes/regulated flows.

## How THIS showcase applies it
**The assistant's behavior (the live widget + transcript):**
- Greeting discloses it's a virtual assistant and offers a human anytime.
- Grounded answers from the company's docs, each footnoted (anti-hallucination).
- A persistent, one-tap "Talk to a person" affordance, never buried.
- Frustration detection → specific empathy + immediate escalation.
- Repeat/loop detection → escalate instead of repeating.
- Every answer ends by confirming resolution ("Did that solve it?") so it resolves, not just replies.
- On escalation it states it's passing the whole conversation so the customer won't repeat themselves.

**The page content:** reframed around resolution, first-contact, no-repeat handoff, transparency, grounded accuracy, the human handoff, and the business economics (cost per resolution, FCR), instead of only "it cites sources." A dedicated "Works with your people, not instead of them" section covers the graceful handoff (the #1 failure point in the research).
