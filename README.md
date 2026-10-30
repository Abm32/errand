# Errand 🪄

**An autonomous shopping agent that spends your money — only within a mandate you grant.**

Submission for the [PayPal AI Hackathon 2026](https://paypalaihackathon.devpost.com/).
Targets the **Best Use of Agentic Commerce** and **Best Use of PayPal + AI** categories.

---

## The one-liner

Everyone is building AI agents that can spend money. Nobody is answering the
scary question: *how do you let an agent spend money safely?*

Errand is an AI shopping agent with a **Mandate** trust layer. You give it a
goal in plain English and a mandate — a budget, a per-item cap, an auto-approve
limit, and allowed categories. The agent researches real products, picks the
best one, and **every proposed purchase passes through the Mandate engine before
a single PayPal call is made**. Small buys clear automatically; bigger ones wait
for one-tap approval; anything outside the rules is denied, with a reason. Every
action is written to a transparent audit ledger.

> Agentic commerce needs an agentic wallet. The Mandate is that wallet.

## Why it wins (rubric fit)

| Criterion | How Errand scores |
|---|---|
| **Technological implementation** | Real AI SDK tool-calling agent + real PayPal Orders v2 (sandbox) + Channel3 product data. |
| **Design** | A complete, usable product, not a demo script. Mandate card, live budget meter, approval flow, audit ledger. |
| **Potential impact** | The safety primitive the entire agentic-commerce wave is missing. Reusable across any spending agent. |
| **Innovation** | Not another shopping bot — the *guardrail layer* is the product. Maps to PayPal's AP2 "mandate" vocabulary. |
| **Presentation** | Clean <3-min demo: goal in → agent shops → mandate gates the spend → PayPal checkout → ledger. |

## Architecture

```
app/page.tsx            Chat UI: goal input, mandate card, approval, activity ledger
app/api/agent/route.ts  POST = run errand · PUT = approve a pending purchase
lib/agent.ts            AI SDK tool-calling agent (deterministic fallback, no key needed)
lib/mandate.ts          ★ The trust layer: screens every purchase before money moves
lib/ledger.ts           Transparent audit log of every agent action
lib/adapters/paypal.ts  PayPal Orders v2 (sandbox) — mock order when no keys
lib/adapters/channel3.ts Channel3 product search — mock catalog when no key
```

**Design principle:** the Mandate engine is the *single gate* in front of every
charge. The spending path uses the PayPal REST API directly so nothing can route
around `screen()`. The PayPal Agent Toolkit is the right tool for the
non-spending surface (invoices, payouts, disputes) — a natural roadmap item.

## Run it (zero config)

```bash
npm install
npm run dev     # http://localhost:3000 — works with NO keys (mock catalog + mock PayPal)
npm test        # mandate engine self-check
```

To go live, copy `.env.example` → `.env.local` and add PayPal sandbox keys
(+ optionally Channel3 and an AI key). See `.env.example`.

## Status

Working prototype. Runs end-to-end offline today. See `HACKATHON.md` for the
full strategy, research, and the remaining build checklist.
