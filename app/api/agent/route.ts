import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";
import { createOrder, captureOrder } from "@/lib/adapters/paypal";
import { record } from "@/lib/ledger";
import { screen } from "@/lib/mandate";
import { getMandate, addSpent, savePending, getPending, dropPending } from "@/lib/store";
import type { Product } from "@/lib/adapters/channel3";

// Settle a purchase: create a PayPal order, capture it, and only on a real
// settlement increment the mandate's server-side spend. Returns the entries to
// append and the authoritative mandate.
async function settle(mandateId: string, product: Product, approvedByHuman: boolean) {
  const order = await createOrder(product.title, product.priceCents);
  const cap = await captureOrder(order.id);
  if (cap.settled) {
    const mandate = addSpent(mandateId, product.priceCents);
    const entry = record({
      kind: "purchased",
      summary: `${approvedByHuman ? "Purchased (you approved)" : "Auto-purchased"} ${product.title}`,
      detail: `Settled via PayPal${cap.mock ? " (sandbox mock)" : ""}.`,
      amountCents: product.priceCents,
      orderId: order.id,
      captureId: cap.captureId,
    });
    return { order, cap, entries: [entry], mandate };
  }
  // Order created but not settled (live sandbox: buyer must approve first).
  const entry = record({
    kind: "ordered",
    summary: `Order created for ${product.title} — awaiting PayPal settlement`,
    detail: `Status ${cap.status}. Approve the order to settle.`,
    amountCents: product.priceCents,
    orderId: order.id,
    approveUrl: order.approveUrl,
  });
  return { order, cap, entries: [entry], mandate: getMandate(mandateId) };
}

// Run an errand against a server-held mandate.
export async function POST(req: NextRequest) {
  const { goal, mandateId } = (await req.json()) as { goal: string; mandateId: string };
  if (!goal?.trim()) return NextResponse.json({ error: "Empty goal." }, { status: 400 });
  const mandate = getMandate(mandateId);
  if (!mandate) return NextResponse.json({ error: "Unknown mandate — create one first." }, { status: 404 });

  const result = await runAgent(goal, mandate);
  const entries = [record({ kind: "search", summary: `Searched for: "${goal}"`, detail: `${result.considered.length} products considered` })];

  if (!result.pick || !result.decision) {
    return NextResponse.json({ ...result, entries, mandate });
  }

  const p = result.pick;
  entries.push(record({ kind: "recommend", summary: `Recommends ${p.title}`, detail: result.reply, amountCents: p.priceCents }));

  if (result.decision.verdict === "deny") {
    entries.push(record({ kind: "denied", summary: "Blocked by mandate", detail: result.decision.reason, amountCents: p.priceCents }));
    return NextResponse.json({ ...result, entries, mandate });
  }

  if (result.decision.verdict === "auto_approve") {
    const s = await settle(mandateId, p, false);
    return NextResponse.json({ ...result, entries: [...entries, ...s.entries], order: s.order, mandate: s.mandate });
  }

  // needs_approval: park a server-side proposal so the price can't be tampered with.
  const proposalId = savePending(mandateId, p);
  entries.push(record({ kind: "awaiting_approval", summary: `Awaiting your approval for ${p.title}`, detail: result.decision.reason, amountCents: p.priceCents, proposalId }));
  return NextResponse.json({ ...result, entries, proposalId, mandate });
}

// Approve a parked proposal. Re-screen against the live server mandate (defense
// in depth) before settling.
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

  const s = await settle(pending.mandateId, p, true);
  dropPending(proposalId);
  return NextResponse.json({ order: s.order, entries: s.entries, mandate: s.mandate });
}
