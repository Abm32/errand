// Hands-free settlement, usable without an HTTP request (the scheduler has no
// NextRequest). Mirrors the auto-approve path in app/api/agent/route.ts so a
// scheduled run settles exactly like a manual one: create the PayPal order
// (vaulted → COMPLETED on create, no human), else capture, then bump the
// server-side spend and log it.
//
// ponytail: this intentionally duplicates ~15 lines of the route's finalize/
// createAndTry rather than refactoring the proven route mid-crunch. Fold both
// onto this helper when the route is next touched.
import { createOrder, captureOrder } from "./adapters/paypal";
import { record, type LedgerEntry } from "./ledger";
import { addSpent, dropPending, setPendingOrder } from "./store";
import type { Product } from "./adapters/channel3";

function finalize(
  mandateId: string,
  pid: string,
  p: Product,
  orderId: string,
  captureId: string | undefined,
  mock: boolean,
  handsFree: boolean,
  scheduled: boolean,
): { settled: true; entry: LedgerEntry } {
  addSpent(mandateId, p.priceCents);
  dropPending(pid);
  const entry = record({
    kind: "purchased",
    summary: `${handsFree ? "Auto-purchased hands-free" : "Auto-purchased"}${scheduled ? " (scheduled)" : ""} ${p.title}`,
    detail: `${scheduled ? "Autonomous standing-errand run — no human in the loop. " : ""}${handsFree ? "Charged the vaulted wallet. " : ""}Settled via PayPal${mock ? " (sandbox mock)" : ""}.`,
    amountCents: p.priceCents,
    orderId,
    captureId,
  });
  return { settled: true, entry };
}

export async function autoSettle(
  mandateId: string,
  pid: string,
  p: Product,
  baseUrl: string,
  vaultId?: string,
  scheduled = false,
): Promise<{ settled: boolean; entry: LedgerEntry }> {
  const order = await createOrder(p.title, p.priceCents, baseUrl, vaultId);
  setPendingOrder(pid, order.id);
  if (order.status === "COMPLETED") {
    return finalize(mandateId, pid, p, order.id, order.captureId, order.mock, !!vaultId, scheduled);
  }
  const cap = await captureOrder(order.id);
  if (cap.settled) {
    return finalize(mandateId, pid, p, order.id, cap.captureId, order.mock, !!vaultId, scheduled);
  }
  const entry = record({
    kind: "ordered",
    summary: `Order created for ${p.title} — needs PayPal approval`,
    detail: `Status ${cap.status}.`,
    amountCents: p.priceCents,
    orderId: order.id,
    approveUrl: order.approveUrl,
  });
  return { settled: false, entry };
}
