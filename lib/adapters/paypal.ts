// PayPal checkout adapter — creates a real Orders v2 order in the PayPal
// Sandbox when PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are set, otherwise
// returns a mock order so the flow is demoable offline.
//
// We use the REST Orders API directly (not the Agent Toolkit) for the spending
// path so the Mandate engine stays the single gate in front of every charge.
// The Agent Toolkit is still the right tool for invoices/payouts/disputes.

const BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export type Order = {
  id: string;
  status: string;
  approveUrl?: string;
  mock: boolean;
};

export type Capture = {
  orderId: string;
  captureId?: string;
  status: string; // COMPLETED = money settled; else needs buyer approval first
  settled: boolean;
  mock: boolean;
};

async function accessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  return (await res.json()).access_token;
}

export async function createOrder(
  description: string,
  amountCents: number,
): Promise<Order> {
  const configured =
    process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET;
  const value = (amountCents / 100).toFixed(2);

  if (!configured) {
    return {
      id: `MOCK-${Date.now()}`,
      status: "CREATED",
      approveUrl: `https://sandbox.paypal.com/checkoutnow?token=MOCK-${Date.now()}`,
      mock: true,
    };
  }

  const token = await accessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        { description: description.slice(0, 127), amount: { currency_code: "USD", value } },
      ],
    }),
  });
  if (!res.ok) throw new Error(`PayPal order failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const approve = (data.links ?? []).find((l: { rel: string; href: string }) => l.rel === "approve" || l.rel === "payer-action");
  return { id: data.id, status: data.status, approveUrl: approve?.href, mock: false };
}

/**
 * Capture (settle) an order. This is where money actually moves.
 * Mock mode always settles. In live sandbox, capture succeeds only once the
 * buyer (or a vaulted payment method) has approved the order — otherwise PayPal
 * returns an error and we surface settled:false so the ledger stays truthful.
 */
export async function captureOrder(orderId: string): Promise<Capture> {
  const configured =
    process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET;

  if (!configured || orderId.startsWith("MOCK-")) {
    return { orderId, captureId: `CAP-${Date.now()}`, status: "COMPLETED", settled: true, mock: true };
  }

  const token = await accessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Most common: ORDER_NOT_APPROVED — buyer must approve via approveUrl first.
    return { orderId, status: data?.name ?? `HTTP_${res.status}`, settled: false, mock: false };
  }
  const captureId = data?.purchase_units?.[0]?.payments?.captures?.[0]?.id;
  return { orderId, captureId, status: data.status, settled: data.status === "COMPLETED", mock: false };
}
