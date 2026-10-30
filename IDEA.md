# Errand — the pitch (reuse for the Devpost write-up)

## Inspiration
AI agents can now browse, reason, and check out on their own. The 2025–2026 wave
("agentic commerce") is real — PayPal shipped an Agent Toolkit and MCP server,
and is co-authoring the AP2 agent-payment standard. But there's a trust gap: the
moment you let an agent hold a card, you've handed autonomous software your
money. Most hackathon shopping bots just... spend. That's a demo, not a product
anyone would actually run.

## What it does
Errand is a shopping agent you send on an **errand** with a **mandate**:

- a **budget** (total it may spend),
- a **per-item cap** (hard ceiling on any single buy),
- an **auto-approve limit** (below this, it just buys; above, it asks you),
- **allowed categories** (it can't wander).

You type a goal — *"birthday gift for my mom who loves gardening, under $40"* —
and the agent searches real products, recommends the best fit, and the **Mandate
engine screens the purchase before any PayPal call**:

- within auto-approve → it buys via PayPal automatically,
- above it → one-tap human approval, then it buys,
- outside the rules → denied, with a plain-English reason.

Every step is written to a transparent **activity ledger** with the PayPal order
IDs, so you can audit exactly what your agent did and why.

## How we built it
- **Next.js 16** (App Router) + TypeScript + Tailwind.
- **AI SDK 7** tool-calling agent — the model searches the catalog itself, then
  recommends one product (with a deterministic fallback so it always runs).
- **PayPal Orders v2** (sandbox) for real checkout.
- **Channel3** for a 100M+ product catalog.
- **The Mandate engine** — a pure, tested policy module that is the single gate
  in front of every charge.

## What makes it different
The product isn't the shopping — it's the **guardrail**. "Agentic commerce needs
an agentic wallet." The Mandate is a reusable safety primitive for *any* agent
that spends, and it maps directly onto PayPal's own AP2 "mandate" concept.

## Safety by design (judges explicitly reward this)
Spend limits, per-item caps, category allowlists, human-in-the-loop approval
above a threshold, re-screening at the moment of approval (defense in depth), and
a full audit trail. An agent can never exceed the mandate.

## What's next
- Push the non-spending surface through the **PayPal Agent Toolkit** (invoices,
  payouts, disputes, subscriptions).
- Server-authoritative mandates in a DB; signed mandate tokens (AP2-style).
- Price-watch / standing errands that run in the background (Render Workflows).

## Built with
`next.js` `typescript` `ai-sdk` `paypal` `channel3` `tailwindcss`
