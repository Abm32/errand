// Server-authoritative state: mandates, their running spend, and pending
// purchase proposals. This is the whole point of the Mandate trust layer —
// the limits and the amount already spent live on the SERVER, not in the
// client. The browser holds only a mandate id; it cannot lift its own limits
// or fake a lower spend / cheaper price, because every decision is made
// against this store.
//
// Persistence: a plain JSON file (stdlib fs, no DB, no keys). It survives
// process restarts on any writable disk. On a read-only / ephemeral-per-instance
// host (e.g. serverless) the write quietly no-ops and we run in-memory — the
// client's recreate-on-404 covers that case.
//
// ponytail: single-file, single-writer, full-rewrite-per-mutation. Fine for a
// demo-scale single instance; swap for Prisma/Postgres for real concurrency/scale.

import fs from "node:fs";
import path from "node:path";
import type { Mandate } from "./mandate";
import type { Product } from "./adapters/channel3";

type Pending = { id: string; mandateId: string; product: Product; orderId?: string };

let mandates = new Map<string, Mandate>();
let pending = new Map<string, Pending>();
let seq = 0;

const file = () => process.env.STORE_FILE ?? path.join(process.cwd(), ".data", "store.json");

/** Fixed id for the demo mandate so a linked wallet + its URL stay stable
 *  across cold starts. The client can open ?mandate=md_demo and always find it. */
export const DEMO_MANDATE_ID = "md_demo";

/**
 * Config seed for the demo mandate. DEMO_MANDATE holds the mandate CONFIG
 * (caps, categories, vaultId) as JSON in an env var, which survives cold starts
 * even where a disk does not. It is a FALLBACK: load() reads store.json first,
 * so if a persisted demo mandate already exists (incl. its running spentCents),
 * this early-returns and the DURABLE SPEND IS PRESERVED. The env seed only
 * creates the mandate at spentCents:0 on a genuinely fresh disk with no prior
 * store.json. So on the mounted Render disk, spend carries across restarts;
 * the env var just guarantees the mandate config can't be lost.
 * ponytail: env-seed + single JSON file, not a DB; use Postgres for multi-instance.
 */
function seedFromEnv() {
  const raw = process.env.DEMO_MANDATE;
  if (!raw || mandates.has(DEMO_MANDATE_ID)) return;
  try {
    const m = JSON.parse(raw) as Omit<Mandate, "spentCents">;
    mandates.set(DEMO_MANDATE_ID, { ...m, spentCents: 0 });
  } catch (e) {
    console.warn("DEMO_MANDATE seed skipped:", (e as Error).message);
  }
}

// Re-read on every access so writes from a separate module context are visible.
// The scheduler runs via instrumentation.ts, which Next may bundle as its own
// module instance; the file is the shared source of truth, so a one-time cache
// would make autonomous spend/mandate updates invisible to the route handlers
// (and vice-versa). ponytail: last-writer-wins full-file rewrite; fine on one
// instance — move to Postgres if concurrent writers ever matter.
function load() {
  try {
    // turbopackIgnore stops Turbopack from tracing the *whole project* for this
    // dynamic path — that trace blows past 8GB at build time once @bryntum is in
    // node_modules. The path is a runtime file, not a build input, so skipping it
    // is correct.
    const s = JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ file(), "utf8"));
    mandates = new Map(s.mandates ?? []);
    pending = new Map(s.pending ?? []);
    seq = s.seq ?? 0;
  } catch {
    /* no file yet, or unreadable — start empty */
  }
  seedFromEnv();
}

function persist() {
  try {
    const f = file();
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify({ mandates: [...mandates], pending: [...pending], seq }));
  } catch (e) {
    console.warn("store persist skipped:", (e as Error).message);
  }
}

const id = (p: string) => `${p}_${++seq}_${Math.random().toString(36).slice(2, 8)}`;

export function createMandate(input: Omit<Mandate, "spentCents">): { mandateId: string; mandate: Mandate } {
  load();
  const mandateId = id("md");
  const mandate: Mandate = { ...input, spentCents: 0 };
  mandates.set(mandateId, mandate);
  persist();
  return { mandateId, mandate };
}

/** Update the human-owned caps/config. Spent is never settable from outside. */
export function updateMandate(
  mandateId: string,
  patch: Partial<Omit<Mandate, "spentCents">>,
): Mandate | undefined {
  load();
  const m = mandates.get(mandateId);
  if (!m) return undefined;
  const next = { ...m, ...patch, spentCents: m.spentCents };
  mandates.set(mandateId, next);
  persist();
  return next;
}

export function getMandate(mandateId: string) {
  load();
  return mandates.get(mandateId);
}

/** Only ever called server-side, after a real capture. */
export function addSpent(mandateId: string, cents: number): Mandate | undefined {
  load();
  const m = mandates.get(mandateId);
  if (!m) return undefined;
  const next = { ...m, spentCents: m.spentCents + cents };
  mandates.set(mandateId, next);
  persist();
  return next;
}

/** Demo-only: reset the seeded demo mandate's daily allowance by zeroing its
 *  spend. Called once every 24h by the scheduler — a real allowance reset, not
 *  a cosmetic refill; within a day the cap binds and runs get denied when spent. */
export function resetDemoSpend(): Mandate | undefined {
  load();
  const m = mandates.get(DEMO_MANDATE_ID);
  if (!m) return undefined;
  const next = { ...m, spentCents: 0 };
  mandates.set(DEMO_MANDATE_ID, next);
  persist();
  return next;
}

export function attachVault(mandateId: string, vaultId: string): Mandate | undefined {
  load();
  const m = mandates.get(mandateId);
  if (!m) return undefined;
  const next = { ...m, vaultId };
  mandates.set(mandateId, next);
  persist();
  return next;
}

export function savePending(mandateId: string, product: Product): string {
  load();
  const pid = id("pr");
  pending.set(pid, { id: pid, mandateId, product });
  persist();
  return pid;
}

export function getPending(pid: string) {
  load();
  return pending.get(pid);
}

export function dropPending(pid: string) {
  load();
  const ok = pending.delete(pid);
  persist();
  return ok;
}

export function setPendingOrder(pid: string, orderId: string) {
  load();
  const p = pending.get(pid);
  if (p) {
    pending.set(pid, { ...p, orderId });
    persist();
  }
}
