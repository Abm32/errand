import { NextRequest, NextResponse } from "next/server";
import { createMandate, updateMandate } from "@/lib/store";
import type { Mandate } from "@/lib/mandate";

// Create or update a mandate. The server owns it from here on; the client keeps
// only the returned mandateId and a read-only view. `spentCents` is never
// accepted from the client.
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Mandate> & { mandateId?: string };
  const config = {
    label: body.label ?? "Errand",
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
