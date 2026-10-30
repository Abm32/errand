import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

// Diagnostic: resolves the active AI provider the same way the agent does and
// reports what its key can see + a one-way fingerprint (never the key), so we
// can tell "wrong key" from "region/IP gating".
function resolve() {
  if (process.env.BASETEN_API_KEY)
    return { provider: "baseten", key: process.env.BASETEN_API_KEY, base: (process.env.BASETEN_BASE_URL ?? "https://inference.baseten.co/v1").replace(/\/$/, ""), model: process.env.BASETEN_MODEL ?? "meta-models/muse-spark-open-1026" };
  const metaKey = process.env.META_API_KEY ?? process.env.MODEL_API_KEY ?? process.env.LLAMA_API_KEY;
  if (metaKey)
    return { provider: "meta", key: metaKey, base: (process.env.META_BASE_URL ?? process.env.MODEL_API_BASE_URL ?? "https://api.meta.ai/v1").replace(/\/$/, ""), model: process.env.META_MODEL ?? process.env.MUSE_MODEL ?? "muse-spark-1.3" };
  return null;
}

export async function GET() {
  const r = resolve();
  if (!r) return NextResponse.json({ ok: false, hasKey: false });
  const out: Record<string, unknown> = {
    provider: r.provider, base: r.base, model: r.model,
    keyLen: r.key.length, keyFp: createHash("sha256").update(r.key).digest("hex").slice(0, 16),
  };
  try {
    const m = await fetch(`${r.base}/models`, { headers: { Authorization: `Bearer ${r.key}` } });
    const t = await m.text();
    let ids: string[] | undefined;
    try { ids = JSON.parse(t).data?.map((x: { id: string }) => x.id); } catch { /* non-json */ }
    out.models = { status: m.status, count: ids?.length ?? null, ids: ids?.slice(0, 25), snippet: ids ? undefined : t.slice(0, 160) };
  } catch (e) { out.models = { error: (e as Error).message }; }
  try {
    const c = await fetch(`${r.base}/chat/completions`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${r.key}` },
      body: JSON.stringify({ model: r.model, messages: [{ role: "user", content: "ok" }], max_tokens: 3 }),
    });
    out.chat = { status: c.status, snippet: (await c.text()).slice(0, 160) };
  } catch (e) { out.chat = { error: (e as Error).message }; }
  return NextResponse.json(out);
}
