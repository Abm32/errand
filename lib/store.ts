// Server-authoritative state: mandates, their running spend, and pending
// purchase proposals. This is the whole point of the Mandate trust layer —
// the limits and the amount already spent live on the SERVER, not in the
// client. The browser holds only a mandate id; it cannot lift its own limits
// or fake a lower spend / cheaper price, because every decision is made
// against this store.
//
// ponytail: in-memory module singleton. Swap for Prisma/Postgres when it must
// survive restarts or scale past one server instance.

import type { Mandate } from "./mandate";
import type { Product } from "./adapters/channel3";

type Pending = { id: string; mandateId: string; product: Product; orderId?: string };

const mandates = new Map<string, Mandate>();
const pending = new Map<string, Pending>();

let seq = 0;
const id = (p: string) => `${p}_${++seq}_${Math.random().toString(36).slice(2, 8)}`;

export function createMandate(input: Omit<Mandate, "spentCents">): { mandateId: string; mandate: Mandate } {
  const mandateId = id("md");
  const mandate: Mandate = { ...input, spentCents: 0 };
  mandates.set(mandateId, mandate);
  return { mandateId, mandate };
}

/** Update the human-owned caps/config. Spent is never settable from outside. */
export function updateMandate(
  mandateId: string,
  patch: Partial<Omit<Mandate, "spentCents">>,
): Mandate | undefined {
  const m = mandates.get(mandateId);
  if (!m) return undefined;
  const next = { ...m, ...patch, spentCents: m.spentCents };
  mandates.set(mandateId, next);
  return next;
}

export const getMandate = (mandateId: string) => mandates.get(mandateId);

/** Only ever called server-side, after a real capture. */
export function addSpent(mandateId: string, cents: number): Mandate | undefined {
  const m = mandates.get(mandateId);
  if (!m) return undefined;
  const next = { ...m, spentCents: m.spentCents + cents };
  mandates.set(mandateId, next);
  return next;
}

export function savePending(mandateId: string, product: Product): string {
  const pid = id("pr");
  pending.set(pid, { id: pid, mandateId, product });
  return pid;
}

export const getPending = (pid: string) => pending.get(pid);
export const dropPending = (pid: string) => pending.delete(pid);

export function setPendingOrder(pid: string, orderId: string) {
  const p = pending.get(pid);
  if (p) pending.set(pid, { ...p, orderId });
}
