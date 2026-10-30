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
            goal (plain English)
                   │
           ┌───────▼────────┐   searches    ┌──────────────┐
           │  Errand agent  │──────────────▶│   Channel3   │
           │ (AI SDK tools) │◀──────────────│  (products)  │
           └───────┬────────┘   products    └──────────────┘
                   │ recommends one product
           ┌───────▼────────┐   screen()    reads server-held
           │ MANDATE engine │◀───────────── budget · spent · caps
           │  (the gate)    │               categories · merchants · expiry
           └───────┬────────┘
       deny ◀──────┼──────▶ needs_approval ──▶ one-tap human approval
                   │ auto_approve / approved
           ┌───────▼────────┐  create+capture  ┌──────────────┐
           │ PayPal Orders  │─────────────────▶│   PayPal     │
           │   v2 adapter   │   settles money  │  (sandbox)   │
           └───────┬────────┘                  └──────────────┘
                   │ on settle → addSpent (server) + ledger entry
                   ▼
          activity ledger (order + capture IDs)
```

```
app/page.tsx             UI: presets, goal input, mandate card, approval, ledger
app/api/mandate/route.ts POST = create/update a server-held mandate (never accepts spent)
app/api/agent/route.ts   POST = run errand (mandateId) · PUT = approve (proposalId)
lib/agent.ts             AI SDK tool-calling agent (search + recommend); deterministic fallback
lib/mandate.ts           ★ The trust layer: screens every purchase before money moves (tested)
lib/store.ts             ★ Server-authoritative mandates, running spend, pending proposals (tested)
lib/ledger.ts            Transparent audit log of every agent action
lib/adapters/paypal.ts   PayPal Orders v2 create + capture (sandbox) — mock when no keys
lib/adapters/channel3.ts Channel3 product search — multi-category mock when no key
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

## Proof: a real PayPal transaction

Errand settles real money in the PayPal **sandbox**, verified end-to-end:

| | |
|---|---|
| Order ID | `79030757MA759121B` — status **COMPLETED** |
| Capture ID | `4JY63429LB471803W` — status **COMPLETED** |
| Amount | **USD 34.00** |
| Flow | agent recommended → Mandate gated (needs approval) → human approved in PayPal → captured |

Full verified capture response: [`docs/settlement-proof.json`](docs/settlement-proof.json)
(fetched straight from PayPal's Orders v2 API). PayPal doesn't support INR, so the
sandbox buyer is US-based and `PAYPAL_CURRENCY=USD`.

## Status

Working prototype with a **real, verified sandbox settlement**. Also runs fully
offline (mock catalog + mock PayPal) with zero keys. See `HACKATHON.md` for the
full strategy, research, and remaining checklist.
