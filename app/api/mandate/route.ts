import { NextRequest, NextResponse } from "next/server";
import { createMandate, updateMandate, getMandate, DEMO_MANDATE_ID } from "@/lib/store";
import type { Mandate } from "@/lib/mandate";

// The durable demo mandate (seeded from env, survives cold starts) if one is
// configured — so a linked wallet persists and judges land on a ready mandate.
export async function GET() {
  const mandate = getMandate(DEMO_MANDATE_ID);
  if (!mandate) return NextResponse.json({ mandate: null });
  return NextResponse.json({ mandateId: DEMO_MANDATE_ID, mandate });
}

// Create or update a mandate. The server owns it from here on; the client keeps
// only the returned mandateId and a read-only view. `spentCents` is never
// accepted from the client.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Mandate> & { mandateId?: string };
  const config = {
    label: body.label ?? "Gofer",
    budgetCents: Math.max(0, Math.round(body.budgetCents ?? 0)),
    perItemCapCents: Math.max(0, Math.round(body.perItemCapCents ?? 0)),
    autoApproveUnderCents: Math.max(0, Math.round(body.autoApproveUnderCents ?? 0)),
    allowedCategories: body.allowedCategories,
    blockedMerchants: body.blockedMerchants,
    expiresAt: body.expiresAt,
  };

  if (body.mandateId) {
    const mandate = updateMandate(body.mandateId, config);
    if (!mandate) return NextResponse.json({ error: "Unknown mandate." }, { status: 404 });
    return NextResponse.json({ mandateId: body.mandateId, mandate });
  }
  return NextResponse.json(createMandate(config));
}
