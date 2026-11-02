# Gofer 🪄

**An autonomous shopping agent that spends your money — only within a mandate you grant.**

Submission for the [PayPal AI Hackathon 2026](https://paypalaihackathon.devpost.com/).
Targets **Best Use of Agentic Commerce** and **Best Use of PayPal + AI**.

**▶ Live demo: https://errand-xl2n.onrender.com** _(Render Standard, always-on — no cold-start wait.)_

---

## The one-liner

Everyone is building AI agents that can spend money. Few are answering the scary
question: *how do you let an agent spend money safely, and unattended?*

Gofer is an AI shopping agent with a **server-enforced Mandate**. You give it a
goal in plain English plus a mandate — a budget, a per-item cap, an auto-approve
limit, allowed categories, blocked merchants, and an expiry. The agent researches
real products, picks the best one, and **every proposed purchase passes through
the Mandate engine before a single PayPal call is made**. Small buys clear
automatically; bigger ones wait for one-tap approval; anything outside the rules
is denied with a reason. Every action is written to a transparent audit ledger.

On top of that, Gofer runs **standing errands** that fire *autonomously* on a
server-side schedule and settle **hands-free** against a vaulted PayPal wallet —
no human in the loop — and stop the moment the Mandate says stop.

> Agentic commerce needs an agentic wallet. The Mandate is that wallet.

## The Mandate trust model (why this is the point)

The limits — and the amount already spent — live on the **server**
(`lib/mandate.ts` + `lib/store.ts`), never in the browser. The client holds only
a `mandateId` and sends a goal. It **cannot** lift its own caps, fake a lower
spend, or submit a cheaper price, because every decision is made server-side
against the stored mandate.

`screen(mandate, purchase)` is a pure, dependency-free function and the **single
gate** in front of every charge. Checks run deny-first:

1. invalid amount → **deny**
2. mandate expired → **deny**
3. merchant blocked → **deny**
4. category not in allowlist → **deny**
5. over per-item cap → **deny**
6. over remaining budget → **deny**
7. at/under auto-approve limit → **auto_approve**
8. otherwise → **needs_approval** (one-tap human approval)

The spending path calls the PayPal REST API directly (not the Agent Toolkit) so
nothing can route around `screen()`. The Agent Toolkit is the right tool for the
*non-spending* surface (invoices, payouts, disputes) — a natural roadmap item.

## How autonomous settlement works

1. A buyer links a PayPal wallet **once** via Vault v3 (setup token → payment
   token / `vault_id`), stored on the mandate.
2. For an auto-approved buy, Gofer creates a **vaulted Orders v2 order**
   (`payment_source.paypal.vault_id`, merchant-initiated). A vaulted order
   settles **`COMPLETED` on create** — money moves with **no buyer present**.
3. The server bumps the mandate's `spentCents` and writes an order + capture ID
   to the ledger.

Standing errands (`lib/scheduler.ts`, booted by `instrumentation.ts`) run the
**same** agent → Mandate → PayPal path a manual run uses, on a cadence, with no
human tap. When the budget runs out, the Mandate **denies** the next run
autonomously — the guardrail, live.

## Verify the autonomy claim in ~30 seconds

```bash
curl https://errand-xl2n.onrender.com/api/ledger
```

Watch for `"(scheduled)"` purchase entries carrying real PayPal `orderId` /
`captureId`s, with the mandate's `spentCents` growing — all produced with **zero
user interaction**. Reload a few times (the UI polls this same endpoint) and you
will see new autonomous runs appear and spend climb.

**Durability, demonstrated in-ledger:** on every server boot the scheduler writes
a `"system"` entry — _"Server booted — spend $X carried from persistent disk"_ —
read straight off the mounted disk at startup. After a redeploy, a **non-zero**
value there is live proof the server-authoritative spend survived the restart
(the "can't overspend across reboots" guarantee, shown rather than asserted); a
`$0.00` means a genuinely fresh disk, shown honestly. The budget is a spend
allowance (**daily/24 h in production**; a short **~15 min** reset in this demo so
the arc is watchable): once it's spent the Mandate **denies** the agent's own
scheduled runs (`denied` entries), then the allowance **resets** (a `system`
"Allowance reset" entry) and buying resumes — the full guardrail loop, live.

## AI model

The agent runs an **AI SDK tool-calling loop** (`search` the catalog →
`recommend` one product). Provider is resolved in `lib/agent.ts`, in order:

1. **Baseten (Meta Muse)** — if `BASETEN_API_KEY` is set. **This is what the live
   deploy uses** (`meta-models/muse-spark-open-1026`). Baseten hosts the open
   Muse model from its own infra, so it works from any region (`api.meta.ai`
   gates its catalog by region/IP, which breaks on cloud hosts like Render).
2. **Meta API direct** — if `META_API_KEY` is set (good for local dev from an
   entitled region), `muse-spark-1.3` at `api.meta.ai`.
3. **Vercel AI Gateway** — if `AI_GATEWAY_API_KEY`/`ANTHROPIC_API_KEY` is set,
   routing `AI_MODEL` (default `anthropic/claude-sonnet-4.5`). This is only the
   **fallback**; `render.yaml`'s `AI_MODEL` value is the Gateway fallback id, not
   the live model.
4. **Deterministic planner** — if no key is available, so the full flow still
   runs for local demos and CI.

Either way, the pick always goes through the Mandate engine before money moves.

## Catalog

Real products via **Channel3** (`CHANNEL3_API_KEY`, set in the deploy):
`POST api.trychannel3.com/v1/search` → buyable items with title, price, merchant,
offer URL, image. A small deterministic mock catalog is the keyless fallback.

## Architecture

```
            goal (plain English)
                   │
           ┌───────▼────────┐   searches    ┌──────────────┐
           │  Gofer agent   │──────────────▶│   Channel3   │
           │ (AI SDK tools) │◀──────────────│  (products)  │
           └───────┬────────┘   products    └──────────────┘
                   │ recommends one product
           ┌───────▼────────┐   screen()    reads server-held
           │ MANDATE engine │◀───────────── budget · spent · caps
           │  (the gate)    │               categories · merchants · expiry
           └───────┬────────┘
       deny ◀──────┼──────▶ needs_approval ──▶ one-tap human approval
                   │ auto_approve / approved
           ┌───────▼────────┐  vaulted order   ┌──────────────┐
           │ PayPal Orders  │─────────────────▶│   PayPal     │
           │ v2 + Vault v3  │  COMPLETED on    │  (sandbox)   │
           └───────┬────────┘  create, no tap  └──────────────┘
                   │ on settle → addSpent (server) + ledger entry
                   ▼
          activity ledger (order + capture IDs)   ⇠ polled by UI + scheduler
```

```
app/page.tsx              UI: presets, goal input, mandate card, approval, ledger
app/LedgerGrid.tsx        AG Grid audit ledger
app/StandingGantt.tsx     Bryntum Gantt of standing errands
app/api/mandate/route.ts  POST = create/update a server-held mandate (never accepts spent)
app/api/agent/route.ts    POST = run errand (mandateId) · PUT = approve · PATCH = capture
app/api/vault/route.ts    POST/PUT = link a PayPal wallet (setup → payment token)
app/api/ledger/route.ts   GET = ledger + live mandate spend (polled by the UI)
instrumentation.ts        boots the autonomous scheduler on server start
lib/mandate.ts            ★ trust layer: screens every purchase before money moves (tested)
lib/store.ts              ★ server-authoritative mandates, running spend, proposals (tested)
lib/scheduler.ts          fires standing errands autonomously, settles hands-free
lib/settle.ts             shared hands-free settle (create vaulted order → capture → record)
lib/agent.ts              AI SDK tool-calling agent (Muse via Baseten); deterministic fallback
lib/adapters/paypal.ts    PayPal Orders v2 + Vault v3 — mock when no keys
lib/adapters/channel3.ts  Channel3 product search — mock when no key
lib/ledger.ts             transparent audit log of every agent action
lib/standing.ts           standing-errand definitions + Bryntum Gantt task projection
```

## Stack / sponsor tools

- **PayPal** — Orders v2 (create + capture) and Vault v3 (setup + payment tokens)
  for hands-free, merchant-initiated settlement.
- **Channel3** — real product catalog search.
- **Render** — single long-lived web service (Standard, always-on) + a `/var/data`
  persistent disk for durable spend and ledger.
- **Next.js 16** (App Router, React 19), **Tailwind v4**, **webpack** build.
- **AG Grid** — audit ledger. **Bryntum Gantt** — standing-errand schedule.
- **AI SDK** (`ai`) tool-calling loop on **Meta Muse via Baseten**.
- **MIT** licensed.

## Run it locally (zero config)

```bash
npm install
npm run dev     # http://localhost:3000 — works with NO keys (mock catalog + mock PayPal)
npm test        # mandate engine + store + standing-errand self-checks
npm run build   # webpack build (Turbopack OOMs on the Bryntum bundle)
```

To go live, copy `.env.example` → `.env.local` and add keys. The scheduler is
off locally by default; set `ENABLE_SCHEDULER=true` (or `DEMO_MANDATE`) to let
standing errands fire in dev.

### Environment variables

| Var | Purpose |
|---|---|
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | PayPal REST creds. Unset → mock orders. |
| `PAYPAL_ENV` | `sandbox` (default) or `live`. |
| `PAYPAL_CURRENCY` | `USD` (PayPal does not support INR as a txn currency). |
| `CHANNEL3_API_KEY` | Real catalog. Unset → mock catalog. |
| `BASETEN_API_KEY` | Meta Muse via Baseten (the live model path). |
| `META_API_KEY` | Meta API direct (local, entitled regions). |
| `AI_GATEWAY_API_KEY` / `ANTHROPIC_API_KEY` + `AI_MODEL` | Vercel AI Gateway fallback. |
| `DEMO_MANDATE` | JSON seed for a fixed `md_demo` mandate; re-created on every boot. |
| `ENABLE_SCHEDULER` | `true` to run autonomous errands (auto-on when `DEMO_MANDATE` is set). |
| `PUBLIC_URL` | Force a public origin for PayPal return URLs (optional). |

## Honest scope: sandbox + what's demo-grade

- **PayPal is sandbox by design.** This is a deliberate safety choice for a public
  hackathon demo that spends money unattended, not a limitation. Going live is a
  **one-flag change**: `PAYPAL_ENV=live` + live credentials. The settlement code
  is identical.
- **File-backed store on a persistent disk — durable across restarts and
  redeploys, proven live.** Mandates, spend, and the ledger are JSON files
  (`lib/store.ts`, `lib/ledger.ts`) on a mounted **Render persistent disk**
  (`/var/data`, via `STORE_FILE`/`LEDGER_FILE`). `load()` reads the file first, so
  the server-authoritative spend survives restarts — the "can't overspend across
  reboots" guarantee holds, not just within one process. **Verified in-ledger:**
  after a reboot the boot `"system"` entry reads the carried spend (observed:
  _"Server booted — spend $29.67 carried from persistent disk"_) — durability
  shown, not asserted. Single instance keeps one file authoritative; Postgres for
  multi-instance scale.
- **The demo mandate is a spend allowance you can watch bind and reset.** Spend is
  durable (above) and the cap genuinely holds — a real spend-limit primitive,
  **daily (24 h) in production**. The live demo uses a low ~$50 allowance and a
  short **~15 min reset** so the whole arc is watchable in one sitting: on-goal
  buys clear → the budget depletes → the agent's own scheduled runs are **denied by
  the Mandate** (`denied` entries) → the allowance **resets** (a `system`
  "Allowance reset" entry) → buying resumes. When no catalog item matches a goal,
  the agent **abstains** (a `system` "No on-goal match" entry) rather than buying
  off-goal. Standing errands re-fire on a ~2.5 min cadence.
- **Standing-errand Gantt is a projection.** The Bryntum Gantt projects the
  cadence deterministically for display; the autonomous firing is the real
  scheduler in `lib/scheduler.ts`.

## Proof: a real PayPal settlement

Gofer settles real money in the PayPal **sandbox**, verified end-to-end:

| | |
|---|---|
| Order ID | `79030757MA759121B` — status **COMPLETED** |
| Capture ID | `4JY63429LB471803W` — status **COMPLETED** |
| Amount | **USD 34.00** |
| Flow | agent recommended → Mandate gated (needs approval) → human approved in PayPal → captured |

Full verified capture response: [`docs/settlement-proof.json`](docs/settlement-proof.json)
(straight from PayPal's Orders v2 API). For the *hands-free* path, the live
`/api/ledger` is the proof — `"(scheduled)"` purchases with real order/capture
IDs settle with no human tap.

See [`docs/SUBMISSION.md`](docs/SUBMISSION.md) for the full hackathon write-up.
