// Real autonomous firing of standing errands. Render runs ONE long-lived Node
// process, so an in-process interval is the honest, dependency-free scheduler:
// on a cadence it runs each standing errand through the SAME agent + Mandate +
// PayPal path a manual run uses, and settles hands-free via the vaulted wallet.
// No human taps anything — the agent genuinely spends on its own, inside the
// server-enforced Mandate. When the budget runs out the Mandate denies the run
// autonomously (the guardrail, live). Everything lands in the shared ledger,
// which the UI polls, so you watch it happen.
//
// ponytail: in-process setInterval + in-memory next-run map is demo-grade on a
// single instance. For multi-instance / durability, move to a real queue or
// Render Cron and persist the schedule.
import { ERRANDS, type StandingErrand } from "./standing";
import { getMandate, savePending, resetDemoSpend, DEMO_MANDATE_ID } from "./store";
import { runAgent } from "./agent";
import { record } from "./ledger";
import { autoSettle } from "./settle";

const CHECK_MS = 10_000; // scan for due errands every 10s
const CADENCE_MS = 150_000; // each errand re-fires ~every 2.5 min (demo cadence)
const STAGGER_MS = [25_000, 55_000, 85_000]; // first runs land soon after boot, spread out
const BUDGET_RESET_MS = 25 * 60_000; // refill the demo budget every 25 min so the cycle repeats

const nextAt = new Map<string, number>();
let lastReset = Date.now();
let started = false;

async function fireOne(e: StandingErrand): Promise<void> {
  const mandate = getMandate(DEMO_MANDATE_ID);
  if (!mandate) return; // demo mandate not seeded (e.g. local without DEMO_MANDATE)
  const baseUrl = process.env.PUBLIC_URL ?? "https://errand-xl2n.onrender.com";

  const result = await runAgent(e.goal, mandate);
  record({
    kind: "search",
    summary: `Scheduled errand: "${e.goal}"`,
    detail: `Standing errand "${e.name}" fired autonomously — ${result.considered.length} products considered`,
  });
  if (!result.pick || !result.decision) return;

  const p = result.pick;
  record({ kind: "recommend", summary: `Recommends ${p.title}`, detail: result.reply, amountCents: p.priceCents });

  if (result.decision.verdict === "deny") {
    record({ kind: "denied", summary: "Blocked by mandate (scheduled)", detail: result.decision.reason, amountCents: p.priceCents });
    return;
  }
  if (result.decision.verdict === "auto_approve") {
    const pid = savePending(DEMO_MANDATE_ID, p);
    await autoSettle(DEMO_MANDATE_ID, pid, p, baseUrl, mandate.vaultId, true);
    return;
  }
  // needs_approval: park it so a human could approve; log that the agent paused.
  const pid = savePending(DEMO_MANDATE_ID, p);
  record({
    kind: "awaiting_approval",
    summary: `Awaiting approval for ${p.title} (scheduled)`,
    detail: result.decision.reason,
    amountCents: p.priceCents,
    proposalId: pid,
  });
}

function tick(): void {
  const now = Date.now();
  // Refill the demo budget on a cycle so judges always see fresh activity (and
  // the depletion → deny → refill arc) rather than a permanently exhausted demo.
  if (now - lastReset > BUDGET_RESET_MS) {
    resetDemoSpend();
    lastReset = now;
  }
  for (const e of ERRANDS) {
    const due = nextAt.get(e.id) ?? 0;
    if (due <= now) {
      nextAt.set(e.id, now + CADENCE_MS);
      fireOne(e).catch((err) => console.warn(`standing run ${e.id} failed:`, (err as Error).message));
    }
  }
}

export function startScheduler(): void {
  if (started) return;
  // Only run where the hosted demo mandate exists, or when explicitly enabled —
  // keeps local `next dev` from firing (and spending) unless opted in.
  if (!process.env.DEMO_MANDATE && process.env.ENABLE_SCHEDULER !== "true") return;
  started = true;
  const now = Date.now();
  ERRANDS.forEach((e, i) => nextAt.set(e.id, now + (STAGGER_MS[i] ?? (i + 1) * 30_000)));
  setInterval(tick, CHECK_MS);
  console.log("standing-errand scheduler started:", ERRANDS.length, "errands");
}
