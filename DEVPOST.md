# Gofer — Devpost submission (ready to paste)

**Project name:** Gofer

**Tagline:** An autonomous shopping agent that spends your money — only within a mandate you grant.

**Live demo:** https://errand-xl2n.onrender.com  (free Render instance — first load after idle wakes in ~50s)
**Repo:** https://github.com/Abm32/errand
**Categories:** Best Use of Agentic Commerce · Best Use of PayPal + AI

---

## Elevator pitch
Everyone is building AI agents that can spend money. Nobody is answering the scary question: how do you let one spend money *safely*? Gofer is an AI shopping agent wrapped in a **Mandate** — a server-enforced spend authorization (budget, per-item cap, auto-approve threshold, category allowlist, blocked merchants, expiry). The agent researches and buys via real PayPal checkout, but every purchase passes the Mandate gate first, and every action is written to a transparent audit ledger. Agentic commerce needs an agentic wallet — the Mandate is that wallet.

## Inspiration
PayPal shipped an Agent Toolkit and is co-authoring the AP2 agent-payment standard — the "agentic commerce" era is real. But the moment you let autonomous software hold a card, you've created a trust problem most demos ignore: they just spend. We wanted the opposite — the guardrail as the product.

## What it does
- You grant a **Mandate**: total budget, per-item cap, an auto-approve limit, allowed categories, blocked merchants, expiry.
- You give a plain-English goal ("a birthday gift for my mom who loves gardening, under $40").
- The agent searches products, recommends the best fit, and the **Mandate engine screens it before any PayPal call**:
  - within auto-approve → it buys,
  - above it → one-tap human approval, then it buys via PayPal,
  - outside the rules → denied, with a plain reason.
- Every step is logged to an **audit ledger** with the real PayPal order + capture IDs.

## How we built it
- **Next.js 16** (App Router) + TypeScript + Tailwind, deployed on **Render**.
- **AI SDK 7** tool-calling agent running on **Meta's Muse** (`muse-spark-1.3`, OpenAI-compatible endpoint) — the model searches the catalog and calls a `recommend` tool to drive the pick (deterministic fallback so it always runs).
- **PayPal Orders v2** (sandbox): real create → approve → capture; spend increments only on a settled capture.
- **Channel3** for product data (mock catalog fallback when no key).
- The **Mandate engine** — a pure, tested policy module that is the single gate in front of every charge — plus a server-authoritative, file-backed store so the client can never fake its own limits or spend.

## Proof it's real
A verified sandbox settlement: PayPal order `79030757MA759121B`, capture `4JY63429LB471803W`, status COMPLETED, USD 34.00 — committed at `docs/settlement-proof.json`. Agent recommended → Mandate gated → human approved → PayPal captured.

## Challenges we ran into
- Making the safety layer *real*, not theater: limits and running spend are server-authoritative (the browser holds only a mandate id), re-screened at the moment of approval.
- PayPal doesn't support INR as a transaction currency — switched to USD with a US sandbox buyer.
- Keeping a truthful money path: "purchased" is only ever logged after an actual COMPLETED capture.

## Accomplishments we're proud of
- A real, settled PayPal sandbox transaction driven by an AI agent through an enforced spend policy.
- A reusable trust primitive (the Mandate) that maps directly onto PayPal's AP2 "mandate" vocabulary.
- Runs end-to-end offline with zero keys, and fully live with sandbox keys.

## What we learned
- Agentic commerce's hard part isn't the buying — it's the authorization and the audit trail.
- Human-in-the-loop above a threshold is both safer and exactly what payment platforms reward.

## What's next
- **PayPal Vault** for true no-human autonomous settlement under the auto-approve limit.
- Wire the **PayPal Agent Toolkit** seller-side surface (invoices, payouts, disputes).
- Signed, portable AP2-style mandate tokens; standing "price-watch" background errands.

## Try it
1. Open the live demo (wait for the first load to wake).
2. Click the **"Needs approval"** preset → watch the agent recommend and the Mandate gate it.
3. **Approve & pay with PayPal** → approve as a sandbox buyer → **complete purchase** → see the order + capture ID in the ledger.
4. Click the **"Blocked by mandate"** preset → watch it get denied with a reason.

## Built with
`next.js` · `typescript` · `ai-sdk` · `meta` (Muse / `muse-spark-1.3`) · `paypal` (orders v2, sandbox) · `channel3` · `tailwindcss` · `render`
