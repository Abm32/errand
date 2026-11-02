# Gofer — PayPal AI Hackathon 2026 submission

**An autonomous shopping agent that spends your money — only within a mandate you grant.**

- **Live demo:** https://errand-xl2n.onrender.com (Render Standard, always-on)
- **Verify autonomy:** https://errand-xl2n.onrender.com/api/ledger
- **Categories:** Best Use of Agentic Commerce · Best Use of PayPal + AI
- **License:** MIT

## The problem

Everyone is building AI agents that can spend money. The hard, unanswered part
isn't "can an agent check out?" — it's **"how do you let an agent spend money
safely, and unattended?"** A browser-side spending limit an agent (or a prompt
injection) can rewrite is not a limit. Hands-free recurring spend with no
server-side guardrail is a blank cheque.

## The solution

Gofer pairs an AI shopping agent with a **server-enforced Mandate** — the trust
layer that governs every charge.

You grant a mandate: budget, per-item cap, auto-approve limit, allowed
categories, blocked merchants, expiry. You hand the agent a goal in plain
English. It researches real products (Channel3), recommends one, and **every
proposed purchase is screened server-side before any PayPal call**:

- within auto-approve limit → buys automatically
- above it → one-tap human approval
- outside the rules → denied, with a reason

Every action lands in a transparent audit ledger. And standing errands fire
**autonomously** on a schedule, settling **hands-free** against a vaulted PayPal
wallet — stopping the instant the Mandate says stop.

## What makes it novel

1. **The Mandate is server-enforced, and it's the product.** Limits *and* spend
   live on the server (`lib/mandate.ts`, `lib/store.ts`). The client holds only a
   `mandateId`; it can't lift caps, fake spend, or inject a cheaper price. The
   spending path uses the PayPal REST API directly so nothing bypasses the single
   `screen()` gate. This maps cleanly to PayPal's AP2 "mandate" vocabulary — the
   reusable safety primitive the whole agentic-commerce wave is missing.

2. **Standing errands fire autonomously over a vaulted wallet.** Not one-shot
   buys — a leash you set once that keeps spending safely over time. A server-side
   scheduler (`lib/scheduler.ts`, booted by `instrumentation.ts`) runs the same
   agent → Mandate → PayPal path a manual run uses, with **no human in the loop**,
   and the Mandate denies autonomously when the budget is exhausted. Vaulted
   Orders v2 orders settle `COMPLETED` on create (merchant-initiated) — real money
   moving with no buyer present, bounded by the Mandate.

## How each sponsor tool is used

| Tool | Use |
|---|---|
| **PayPal** | Orders v2 (create + capture) and Vault v3 (setup token → payment token) for hands-free, merchant-initiated settlement. Sandbox by design; live is a one-flag change. `lib/adapters/paypal.ts` |
| **Channel3** | Real product catalog search (`/v1/search`) — title, price, merchant, buyable offer URL, image. `lib/adapters/channel3.ts` |
| **Render** | Single long-lived web service (Standard, always-on) + a `/var/data` persistent disk — one instance keeps the file-backed store authoritative. `render.yaml` |
| **AG Grid** | The audit ledger grid. `app/LedgerGrid.tsx` |
| **Bryntum Gantt** | Standing-errand schedule view. `app/StandingGantt.tsx` |
| **AI SDK + Meta Muse (Baseten)** | Tool-calling agent loop (`search` → `recommend`) on Meta Muse hosted by Baseten; deterministic fallback with no key. `lib/agent.ts` |
| **Next.js 16 / React 19 / Tailwind v4** | App Router app, webpack build. |

## Verify the autonomy claim in 30 seconds

1. Open https://errand-xl2n.onrender.com/api/ledger (or hit it with `curl`).
2. Look for `"(scheduled)"` purchase entries carrying real PayPal `orderId` and
   `captureId`s, with the mandate's `spentCents` climbing.
3. Reload after a minute or two: new autonomous runs appear and `spentCents`
   grows — no user action. The budget is a **daily allowance**: once the day's
   budget is spent the Mandate **denies** the agent's own runs until the 24 h
   reset (so denials show once the allowance is exhausted, not every minute).
4. **Durability is shown in the ledger, not just claimed:** each boot writes a
   `"system"` entry reading the persisted spend off the mounted disk. A non-zero
   _"spend $X carried from persistent disk"_ after a redeploy is live proof the
   cap survives restarts; `$0.00` means a fresh disk, shown honestly.

The UI at the live URL polls that same endpoint, so you can also just watch the
ledger and budget meter update live.

## Honest scope

- **PayPal is sandbox** — deliberate, for a public demo that spends unattended.
  `PAYPAL_ENV=live` + live creds flips it; settlement code is identical.
- **File-backed store on a persistent Render disk** (`/var/data`) — spend and the
  ledger survive restarts and redeploys. **Verified live:** after a reboot the boot
  `"system"` entry reads the carried spend (observed _"spend $29.67 carried from
  persistent disk"_), so the cap holds across reboots, shown in-ledger not asserted.
  Single-instance; Postgres for real concurrency/scale.
- **The demo mandate is a daily allowance** — spend is durable (above) and the cap
  genuinely binds and resets once every 24 h (a real spend-limit primitive);
  allowance set low (~$50) so deplete→deny is observable within minutes.
  Once the day's budget is spent, the agent's own scheduled runs are **denied by
  the Mandate** until the next reset. Errands re-fire on a ~2.5 min cadence so
  there's always fresh activity to watch.

## Proof of a real settlement

| | |
|---|---|
| Order ID | `79030757MA759121B` — **COMPLETED** |
| Capture ID | `4JY63429LB471803W` — **COMPLETED** |
| Amount | USD 34.00 |

Full capture response from PayPal's Orders v2 API: `docs/settlement-proof.json`.
For the hands-free path, the live `/api/ledger` is the standing proof.
