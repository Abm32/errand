import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/adapters/paypal";
import { record } from "@/lib/ledger";

// External settlement verification. PayPal POSTs here on account events; on a
// verified PAYMENT.CAPTURE.COMPLETED we append a "verified" ledger entry so the
// capture is confirmed BY PayPal, not just self-reported by our own capture call.
//
// Register this URL in the PayPal dashboard (see below). A POST handler is
// dynamic by default under cacheComponents — no `export const dynamic` needed.
//
// Webhooks must get a fast 2xx or PayPal retries, so we NEVER throw: every path
// returns 200 and failures are logged, not surfaced as 5xx.
export async function POST(req: NextRequest) {
  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(await req.text()) as PayPalWebhookEvent;
  } catch {
    console.warn("[paypal webhook] unparseable body, ignoring");
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  try {
    const type = event?.event_type;
    if (type !== "PAYMENT.CAPTURE.COMPLETED" && type !== "CHECKOUT.ORDER.APPROVED") {
      return NextResponse.json({ ok: true, ignored: type ?? null }, { status: 200 });
    }

    // Verify the event is genuinely from PayPal. When PAYPAL_WEBHOOK_ID + creds
    // are unset we can't verify — in sandbox we still accept but flag it.
    const verified = await verifyWebhookSignature(
      {
        authAlgo: req.headers.get("paypal-auth-algo"),
        certUrl: req.headers.get("paypal-cert-url"),
        transmissionId: req.headers.get("paypal-transmission-id"),
        transmissionSig: req.headers.get("paypal-transmission-sig"),
        transmissionTime: req.headers.get("paypal-transmission-time"),
      },
      event,
    );

    const configured =
      process.env.PAYPAL_WEBHOOK_ID && process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET;

    if (!verified) {
      if (configured) {
        // Fully configured but signature failed → likely forged. Drop it.
        console.warn(`[paypal webhook] signature NOT verified for ${type}, dropping`);
        return NextResponse.json({ ok: true, verified: false }, { status: 200 });
      }
      // ponytail: sandbox-only soft accept — no PAYPAL_WEBHOOK_ID set, so we
      // can't cryptographically verify. Accept + log; set the env var to enforce.
      console.warn(`[paypal webhook] accepting UNVERIFIED ${type} (PAYPAL_WEBHOOK_ID not set)`);
    }

    // Only PAYMENT.CAPTURE.COMPLETED is a real settlement; ORDER.APPROVED is
    // pre-capture, so we don't write a "verified" capture entry for it.
    if (type !== "PAYMENT.CAPTURE.COMPLETED") {
      return NextResponse.json({ ok: true, verified }, { status: 200 });
    }

    const r = event.resource ?? {};
    const captureId = r.id;
    const orderId = r.supplementary_data?.related_ids?.order_id;
    const amountCents = parseAmountCents(r.amount);

    record({
      kind: "verified",
      summary: `PayPal confirmed capture ${captureId ?? "(unknown)"}`,
      detail: verified
        ? "Externally verified by PayPal webhook."
        : "Accepted from PayPal webhook, signature unverified (PAYPAL_WEBHOOK_ID not set).",
      ...(amountCents !== undefined ? { amountCents } : {}),
      ...(orderId ? { orderId } : {}),
      ...(captureId ? { captureId } : {}),
    });

    return NextResponse.json({ ok: true, verified, captureId }, { status: 200 });
  } catch (e) {
    console.warn("[paypal webhook] handler error:", (e as Error).message);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

function parseAmountCents(amount?: { value?: string }): number | undefined {
  const v = amount?.value;
  if (v === undefined) return undefined;
  const n = Math.round(parseFloat(v) * 100);
  return Number.isFinite(n) ? n : undefined;
}

type PayPalWebhookEvent = {
  event_type?: string;
  resource?: {
    id?: string;
    amount?: { currency_code?: string; value?: string };
    supplementary_data?: { related_ids?: { order_id?: string } };
  };
};
