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
  returnUrl?: string,
  vaultId?: string,
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
  const currency = process.env.PAYPAL_CURRENCY ?? "USD"; // match the sandbox accounts' currency

  // Vaulted (merchant-initiated): charge a saved wallet with no buyer present.
  const body = vaultId
    ? {
        intent: "CAPTURE",
        purchase_units: [{ description: description.slice(0, 127), amount: { currency_code: currency, value } }],
        payment_source: { paypal: { attributes: { vault_id: vaultId } } },
      }
    : {
        intent: "CAPTURE",
        purchase_units: [{ description: description.slice(0, 127), amount: { currency_code: currency, value } }],
        application_context: { user_action: "PAY_NOW", ...(returnUrl ? { return_url: returnUrl, cancel_url: returnUrl } : {}) },
      };

  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PayPal order failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const approve = (data.links ?? []).find((l: { rel: string; href: string }) => l.rel === "approve" || l.rel === "payer-action");
  return { id: data.id, status: data.status, approveUrl: approve?.href, mock: false };
}

// ---- Vault: save a PayPal wallet once, then charge it hands-free ----

export type SetupToken = { id: string; approveUrl?: string; mock: boolean };

/** Step 1: create a setup token; buyer approves it once to consent to vaulting. */
export async function createSetupToken(returnUrl: string): Promise<SetupToken> {
  const configured = process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET;
  if (!configured) return { id: `MOCK-ST-${Date.now()}`, approveUrl: `https://sandbox.paypal.com/agreements/approve?token=MOCK-ST`, mock: true };

  const token = await accessToken();
  const res = await fetch(`${BASE}/v3/vault/setup-tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "PayPal-Request-Id": `st-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
    body: JSON.stringify({
      payment_source: {
        paypal: {
          usage_type: "MERCHANT",
          customer_type: "CONSUMER",
          experience_context: {
            shipping_preference: "NO_SHIPPING",
            return_url: returnUrl,
            cancel_url: returnUrl,
          },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`PayPal setup-token failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const approve = (data.links ?? []).find((l: { rel: string; href: string }) => l.rel === "approve" || l.rel === "payer-action");
  return { id: data.id, approveUrl: approve?.href, mock: false };
}

/** Step 2: exchange an approved setup token for a durable payment token (vault_id). */
export async function createPaymentToken(setupTokenId: string): Promise<{ vaultId: string; mock: boolean }> {
  const configured = process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET;
  if (!configured || setupTokenId.startsWith("MOCK-ST")) return { vaultId: `MOCK-VAULT-${Date.now()}`, mock: true };

  const token = await accessToken();
  const res = await fetch(`${BASE}/v3/vault/payment-tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "PayPal-Request-Id": `pt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
    body: JSON.stringify({ payment_source: { token: { id: setupTokenId, type: "SETUP_TOKEN" } } }),
  });
  if (!res.ok) throw new Error(`PayPal payment-token failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return { vaultId: data.id, mock: false };
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
