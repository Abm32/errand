import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";
import { createOrder } from "@/lib/adapters/paypal";
import { record } from "@/lib/ledger";
import { screen, type Mandate } from "@/lib/mandate";

// ponytail: mandate comes from the client for the demo. In production the
// mandate + spent total must be server-authoritative (DB) so the client can't
// lift its own spending limits.

export async function POST(req: NextRequest) {
  const { goal, mandate } = (await req.json()) as { goal: string; mandate: Mandate };
  if (!goal?.trim()) return NextResponse.json({ error: "Empty goal." }, { status: 400 });

  const result = await runAgent(goal, mandate);
  const entries = [record({ kind: "search", summary: `Searched for: "${goal}"`, detail: `${result.considered.length} products considered` })];

  if (result.pick && result.decision) {
    const p = result.pick;
    entries.push(record({ kind: "recommend", summary: `Recommends ${p.title}`, detail: result.reply, amountCents: p.priceCents }));

    if (result.decision.verdict === "deny") {
      entries.push(record({ kind: "denied", summary: "Blocked by mandate", detail: result.decision.reason, amountCents: p.priceCents }));
    } else if (result.decision.verdict === "auto_approve") {
      const order = await createOrder(p.title, p.priceCents);
      entries.push(record({ kind: "purchased", summary: `Auto-purchased ${p.title}`, detail: result.decision.reason, amountCents: p.priceCents, orderId: order.id, approveUrl: order.approveUrl }));
      return NextResponse.json({ ...result, entries, order, spentDeltaCents: p.priceCents });
    } else {
      entries.push(record({ kind: "awaiting_approval", summary: `Awaiting your approval for ${p.title}`, detail: result.decision.reason, amountCents: p.priceCents }));
    }
  }

  return NextResponse.json({ ...result, entries, spentDeltaCents: 0 });
}

// Human approves a pending purchase. Re-screen before charging (defense in depth).
export async function PUT(req: NextRequest) {
  const { mandate, pick } = (await req.json()) as { mandate: Mandate; pick: { title: string; priceCents: number; category?: string; merchant?: string } };
  const decision = screen(mandate, { title: pick.title, amountCents: pick.priceCents, category: pick.category, merchant: pick.merchant });
  if (decision.verdict === "deny") {
    const e = record({ kind: "denied", summary: "Blocked by mandate at approval", detail: decision.reason, amountCents: pick.priceCents });
    return NextResponse.json({ error: decision.reason, entries: [e] }, { status: 409 });
  }
  const order = await createOrder(pick.title, pick.priceCents);
  const e = record({ kind: "purchased", summary: `Purchased ${pick.title} (you approved)`, amountCents: pick.priceCents, orderId: order.id, approveUrl: order.approveUrl });
  return NextResponse.json({ order, entries: [e], spentDeltaCents: pick.priceCents });
}
