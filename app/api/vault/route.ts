import { NextRequest, NextResponse } from "next/server";
import { createSetupToken, createPaymentToken } from "@/lib/adapters/paypal";
import { getMandate, attachVault } from "@/lib/store";
import { returnUrl } from "@/lib/return-url";

// Step 1: start wallet linking — buyer approves the setup token once.
export async function POST(req: NextRequest) {
  const { mandateId } = (await req.json()) as { mandateId: string };
  if (!getMandate(mandateId)) return NextResponse.json({ error: "Unknown mandate." }, { status: 404 });
  const st = await createSetupToken(returnUrl(req));
  return NextResponse.json({ setupTokenId: st.id, approveUrl: st.approveUrl, mock: st.mock });
}

// Step 2: after approval, exchange the setup token for a durable vault id.
export async function PUT(req: NextRequest) {
  const { mandateId, setupTokenId } = (await req.json()) as { mandateId: string; setupTokenId: string };
  if (!getMandate(mandateId)) return NextResponse.json({ error: "Unknown mandate." }, { status: 404 });
  if (!setupTokenId) return NextResponse.json({ error: "Missing setup token." }, { status: 400 });
  try {
    const { vaultId } = await createPaymentToken(setupTokenId);
    const mandate = attachVault(mandateId, vaultId);
    return NextResponse.json({ mandate, linked: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
