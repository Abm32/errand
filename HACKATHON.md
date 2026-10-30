# PayPal AI Hackathon 2026 — strategy, research & prep

Everything we learned, the plan, and exactly what you need to study and prepare.
Last updated: 2026-10-30.

---

## 1. The facts (verified)

| | |
|---|---|
| **Event** | PayPal AI Hackathon 2026 (Devpost) |
| **Submissions open** | Oct 1, 2026 |
| **Submissions close** | **Nov 12, 2026** (one source says Nov 13 ~01:30 IST — treat Nov 12 as the deadline; confirm the exact time on Devpost) |
| **Winners announced** | Dec 21, 2026 |
| **Time left (from Oct 30)** | ~**13 days** |
| **Entry rule** | Must **meaningfully use both PayPal and AI**. No prescribed tracks. |
| **PayPal use** | ≥1 PayPal API/SDK/product in the **free Sandbox**. |
| **AI use** | A model / ML / agent in the **core** experience or backend. Any model allowed. |
| **Must submit** | A **working prototype** (functional PoC). Mockups and slide decks do **not** qualify. |
| **Eligibility** | Legal age of majority; global (ex-restricted regions); solo or team; new projects or existing projects with meaningful updates during the hackathon. Free. |

### Prizes (~$67,500 cash + credits)
- **Best Overall:** 1st **$12,000** · 2nd $8,000 · 3rd $5,000
- **Honorable mentions ($5,000 each):** Most Creative · Most Impactful · Best Demo Delivery · **Best Use of PayPal + AI** · **Best Use of Agentic Commerce**
- **Sponsor bonuses:** AG Grid ($5k/$2k/$1k×3) · APIMatic ($1k×3 + subs) · Bryntum ($1k×3) · Channel3 ($1,500) · Render (credits $1k/$750/$500)

### Judging criteria — **5 criteria, weighted equally** (~20% each)
1. **Technological implementation** — real, non-trivial use of PayPal **and** AI.
2. **Design** — a complete, coherent product, not just a tech demo.
3. **Potential impact** — how much it could matter to users/businesses.
4. **Innovation** — how original the idea is.
5. **Presentation** — how clearly it's explained and demonstrated.

### Sponsor tools (free credits)
APIMatic (PayPal context plugin for agents) · Render (deploy/orchestrate agents,
Workflows) · Kernel (web-browsing agents) · **Channel3 (100M+ product data API)** ·
Postman · Astropods (agent infra) · Elastic (vector/hybrid search) · AG Grid
(dashboards) · Bryntum (scheduler/gantt) · Zapier.

---

## 2. What makes projects win (pattern study)

From PayPal's own tips + recent payments/agent hackathon winners
(Morph "Build In! Payments" → *Sniffy*, agents autonomously paying for data;
*Mandate402*, x402 agentic payments; Google ADK → *SalesShortcut*; DataHub →
*Project Blackbox*, an autonomous agent):

1. **Working > ambitious-but-broken.** A small, polished, *usable* app beats a
   grand idea that doesn't run. Judges run it or use a hosted version.
2. **PayPal at the core, not bolted on.** A chatbot with a "pay" button loses.
   The payment must be central to the value.
3. **True autonomy is the theme.** Winners are *agents that act* — they transact,
   not just chat. "Best Use of Agentic Commerce" is the headline new category.
4. **Safety is a differentiator, not overhead.** PayPal explicitly says: if an
   agent can spend money, show clear **approval steps and spending limits**.
   Almost nobody builds this well → our moat.
5. **Depth over breadth.** Use **one** sponsor tool *well* (we pick Channel3),
   not five superficially.
6. **A tight <3-min demo.** Show the problem → the AI moment → the PayPal payment,
   in that order. "Best Demo Delivery" is its own $5k prize.
7. **Deploy it.** Hosted + public. (Render gives credits and its own prize.)

---

## 3. Our bet: **Errand**

An autonomous shopping agent whose product *is the guardrail*: a **Mandate**
trust layer (budget, per-item cap, auto-approve threshold, category allowlist,
human-in-the-loop approval, audit ledger) in front of real PayPal checkout, with
real product data from Channel3.

**Why this wins on all five axes** — see `README.md` table. In short: it's the
safety primitive the whole agentic-commerce wave is missing, it's a complete
usable product, it uses PayPal at the core, and it demos in one clean flow.

**Categories targeted:** Best Use of Agentic Commerce + Best Use of PayPal + AI
(+ Channel3 sponsor prize, + Render for deploy). Overall is the stretch.

**Chosen sponsor (deep):** Channel3 (product search). Optional easy adds: Render
(deploy), APIMatic (PayPal context plugin) if time allows.

---

## 4. What YOU need to prepare & study

### Accounts / keys to get (do first — blocks live mode)
- [ ] **Register on Devpost** for the hackathon (you've applied — confirm you're in).
- [ ] **PayPal Developer account** → create a **Sandbox** app → copy
      `CLIENT_ID` + `CLIENT_SECRET`. https://developer.paypal.com/dashboard/
- [ ] **Channel3 API key** (sponsor — free credits). Grab from their hackathon link.
- [ ] **AI key**: a Vercel **AI Gateway** key *or* an Anthropic key. (App runs
      without one via the deterministic fallback, but live AI is more impressive.)
- [ ] **Render account** (free) for deployment + the Render prize.

### Study (short, targeted)
- [ ] **PayPal Orders v2** (create order, capture) — the API we call directly.
      https://developer.paypal.com/docs/api/orders/v2/
- [ ] **PayPal Agent Toolkit** README (invoices/payouts/disputes tools) — our
      roadmap surface. https://github.com/paypal/agent-toolkit
- [ ] **PayPal + agentic commerce / AP2** framing (so the pitch uses PayPal's own
      vocabulary — "mandate", agent payments).
      https://developer.paypal.com/community/blog/paypal-agentic-ai-toolkit/
- [ ] **Channel3 API** docs — confirm the real search endpoint/response shape and
      update `lib/adapters/channel3.ts` field names to match.
- [ ] **AI SDK 7** tool-calling (`generateText` + `tools` + `stopWhen`).
- [ ] Watch PayPal's hackathon webinars if recordings exist (Oct 6/7/12/13).

### Deliverables to produce (for the submission)
- [ ] **Hosted public URL** (deploy to Render/Vercel).
- [ ] **Public GitHub repo** (done — this repo).
- [ ] **Demo video < 3 min** (script in §6). This is scored *and* has its own prize.
- [ ] **Devpost write-up** — reuse `IDEA.md` (inspiration / what it does / how /
      what's next / built-with).
- [ ] **Screenshots** of the mandate card, approval flow, and ledger.

---

## 5. Build checklist (what's done vs. left)

**Done (runs offline today):**
- [x] Next.js 16 app scaffolded, builds clean.
- [x] **Mandate engine** (`lib/mandate.ts`) + passing self-check (`npm test`).
- [x] AI SDK tool-calling agent that **drives the pick** via a `recommend` tool
      (single loop, no discarded reasoning) + deterministic fallback (`lib/agent.ts`).
- [x] **Server-authoritative mandate** (`lib/store.ts`): limits + running spend +
      pending proposals live on the server. Verified the client cannot fake the
      spent total or tamper a parked proposal's price.
- [x] **Full PayPal capture flow** (`captureOrder`): create → capture → ledger
      shows `order` + `captureId`; spend only increments on a real settlement.
- [x] Channel3 adapter + multi-category mock (so the allowlist denial is demoable).
- [x] Chat UI: goal input, mandate card (editable caps + categories, clamped
      budget meter), approval flow, audit ledger — all reading server truth.
- [x] `/api/mandate` (create/update) + `/api/agent` run (POST) & approve (PUT).

**✅ LIVE PROOF (2026-10-30):** real PayPal sandbox settlement verified end-to-end —
order `79030757MA759121B` / capture `4JY63429LB471803W`, status COMPLETED, USD 34.00.
Agent recommended → Mandate gated (needs_approval) → human approved in PayPal → captured.
Note: PayPal does not support INR; used USD + a US sandbox buyer
(`sb-73b1s53635996@personal.example.com`). Set `PAYPAL_CURRENCY=USD`.

**Left to do (priority order):**
1. [x] ~~Add real keys; verify a real PayPal sandbox order + capture.~~ DONE (see above).
2. [ ] Verify the **Channel3** live endpoint shape; fix adapter field names.
3. [ ] Confirm the **AI model id** for your gateway/provider in `.env` (`AI_MODEL`).
4. [ ] Auto-approve path in live sandbox needs a buyer-approved/**vaulted** payment
       method (Orders v2 needs approval before capture) — wire PayPal Vault, or
       demo the human-approved path for live settlement.
5. [x] ~~Persist store so mandates survive restarts.~~ DONE — file-backed store +
       ledger (stdlib fs, no deps), verified across processes. DB (Prisma/Postgres)
       remains the upgrade for multi-instance/concurrency.
6. [ ] **Deploy** to Render; set env vars; smoke-test the hosted URL.
7. [ ] Record the **demo video**; write the **Devpost** entry.
8. [ ] (Stretch) Wire one real **PayPal Agent Toolkit** action (seller-side
       invoice/payout) once keys are in — adds PayPal depth. (Stretch) background
       "price-watch" standing errand.

---

## 6. Demo script (<3 min)

1. **(20s) Problem.** "AI agents can now spend money. Would you give one your
   card? Errand makes that safe."
2. **(30s) Mandate.** Show the mandate card: $50 budget, $40 cap, auto-approve
   under $20, categories = gardening/books. "This is the agent's wallet. It
   physically cannot spend outside this."
3. **(40s) The errand.** Type the goal. Watch it search real products (Channel3),
   reason, and recommend one. Point at the live budget meter + ledger filling in.
4. **(40s) The gate + PayPal.** It's over the auto-approve limit → one-tap
   **Approve & pay with PayPal** → real sandbox order ID in the ledger. Then try a
   goal that violates the mandate → **denied, with a reason**.
5. **(20s) Why it matters.** "Agentic commerce needs an agentic wallet. The
   Mandate is a reusable safety layer for any spending agent — built on PayPal."

---

## 7. Sources
- https://paypalaihackathon.devpost.com/ (official — confirm exact deadline/time)
- https://developer.paypal.com/community/blog/PayPal_AI_Hackathon
- https://developer.paypal.com/community/blog/paypal-agentic-ai-toolkit/
- https://github.com/paypal/agent-toolkit
- https://thegenaimagazine.com/paypal-ai-hackathon-2026-ideas-deadline-prizes (rubric + idea list)
- Morph "Build In! Payments" winners (Sniffy, Mandate402) — agent-pays-for-things pattern.
