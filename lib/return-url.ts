import type { NextRequest } from "next/server";

// The public origin to send a PayPal buyer back to. Behind a proxy (Render)
// req.url is the internal origin (localhost:10000), so a return_url built from it
// is a dead redirect. Prefer an explicit PUBLIC_URL, else the forwarded
// host/proto the proxy sets, else fall back to req.url.
export function returnUrl(req: NextRequest): string {
  if (process.env.PUBLIC_URL) return new URL("/", process.env.PUBLIC_URL).toString();
  const host = req.headers.get("x-forwarded-host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}/`;
  return new URL("/", req.url).toString();
}
