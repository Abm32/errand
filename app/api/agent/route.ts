import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";
import { createOrder, captureOrder } from "@/lib/adapters/paypal";
import { record } from "@/lib/ledger";
import { screen } from "@/lib/mandate";
import { getMandate, addSpent, savePending, getPending, dropPending, setPendingOrder } from "@/lib/store";
import type { Product } from "@/lib/adapters/channel3";

const returnUrl = (req: NextRequest) => new URL("/", req.url).toString();

// Finalize a settled capture: bump the server-side spend and log it.
function finalize(mandateId: string, pid: string, p: Product, orderId: string, captureId: string | undefined, approvedByHuman: boolean, mock: boolean, handsFree = false) {
  const mandate = addSpent(mandateId, p.priceCents);
  dropPending(pid);
  const entry = record({
    kind: "purchased",
    summary: `${approvedByHuman ? "Purchased (you approved)" : handsFree ? "Auto-purchased hands-free" : "Auto-purchased"} ${p.title}`,
    detail: `${handsFree ? "No human tap — charged your vaulted wallet. " : ""}Settled via PayPal${mock ? " (sandbox mock)" : ""}.`,
    amountCents: p.priceCents,
    orderId,
    captureId,
  });
  return { settled: true, order: { id: orderId, mock }, entries: [entry], mandate };
}

// Create a PayPal order for a parked proposal and try to capture immediately.
// Mock settles at once; live sandbox needs buyer approval first (returns the
// approveUrl and leaves the proposal open to capture via PATCH).
async function createAndTry(req: NextRequest, mandateId: string, pid: string, p: Product, approvedByHuman: boolean, vaultId?: string) {
  const order = await createOrder(p.title, p.priceCents, returnUrl(req), vaultId);
  setPendingOrder(pid, order.id);
  const cap = await captureOrder(order.id);
  if (cap.settled) return finalize(mandateId, pid, p, order.id, cap.captureId, approvedByHuman, order.mock, !!vaultId);
  const entry = record({
    kind: "ordered",
    summary: `Order created for ${p.title} — approve in PayPal to settle`,
    detail: `Status ${cap.status}.`,
    amountCents: p.priceCents,
    orderId: order.id,
    approveUrl: order.approveUrl,
  });
  return { settled: false, order, approveUrl: order.approveUrl, proposalId: pid, entries: [entry], mandate: getMandate(mandateId) };
}

// Run an errand against a server-held mandate.
export async function POST(req: NextRequest) {
  const { goal, mandateId } = (await req.json()) as { goal: string; mandateId: string };
  if (!goal?.trim()) return NextResponse.json({ error: "Empty goal." }, { status: 400 });
  const mandate = getMandate(mandateId);
  if (!mandate) return NextResponse.json({ error: "Unknown mandate — create one first." }, { status: 404 });

  const result = await runAgent(goal, mandate);
  const entries = [record({ kind: "search", summary: `Searched for: "${goal}"`, detail: `${result.considered.length} products considered` })];

  if (!result.pick || !result.decision) return NextResponse.json({ ...result, entries, mandate });

  const p = result.pick;
  entries.push(record({ kind: "recommend", summary: `Recommends ${p.title}`, detail: result.reply, amountCents: p.priceCents }));

  if (result.decision.verdict === "deny") {
    entries.push(record({ kind: "denied", summary: "Blocked by mandate", detail: result.decision.reason, amountCents: p.priceCents }));
    return NextResponse.json({ ...result, entries, mandate });
  }

  if (result.decision.verdict === "auto_approve") {
    const pid = savePending(mandateId, p);
    // If a wallet is vaulted, settle hands-free (no human). Otherwise fall back
    // to the approve→capture flow.
    const s = await createAndTry(req, mandateId, pid, p, false, mandate.vaultId);
    return NextResponse.json({ ...result, ...s, entries: [...entries, ...s.entries] });
  }

  // needs_approval: park the proposal; the order is created when the human approves.
  const pid = savePending(mandateId, p);
  entries.push(record({ kind: "awaiting_approval", summary: `Awaiting your approval for ${p.title}`, detail: result.decision.reason, amountCents: p.priceCents, proposalId: pid }));
  return NextResponse.json({ ...result, entries, proposalId: pid, mandate });
}

// Human approves a needs_approval proposal: create the order and try to settle.
// Re-screen against the live server mandate first (defense in depth).
export async function PUT(req: NextRequest) {
  const { proposalId } = (await req.json()) as { proposalId: string };
  const pending = getPending(proposalId);
  if (!pending) return NextResponse.json({ error: "Unknown or expired proposal." }, { status: 404 });
  const mandate = getMandate(pending.mandateId);
  if (!mandate) return NextResponse.json({ error: "Unknown mandate." }, { status: 404 });

  const p = pending.product;
  const decision = screen(mandate, { title: p.title, amountCents: p.priceCents, category: p.category, merchant: p.merchant });
  if (decision.verdict === "deny") {
    const e = record({ kind: "denied", summary: "Blocked by mandate at approval", detail: decision.reason, amountCents: p.priceCents });
    return NextResponse.json({ error: decision.reason, entries: [e], mandate }, { status: 409 });
  }

  const s = await createAndTry(req, pending.mandateId, proposalId, p, true);
  return NextResponse.json(s);
}

// Capture after the buyer approved the order in PayPal (live sandbox two-step).
export async function PATCH(req: NextRequest) {
  const { proposalId } = (await req.json()) as { proposalId: string };
  const pending = getPending(proposalId);
  if (!pending?.orderId) return NextResponse.json({ error: "No order to capture." }, { status: 404 });
  const cap = await captureOrder(pending.orderId);
  if (!cap.settled) {
    return NextResponse.json({ settled: false, error: `Not settled yet (${cap.status}). Approve the order in PayPal first.` }, { status: 409 });
  }
  const s = finalize(pending.mandateId, proposalId, pending.product, pending.orderId, cap.captureId, true, cap.mock);
  return NextResponse.json(s);
}
