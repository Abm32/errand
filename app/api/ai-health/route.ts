import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

// Diagnostic: reports what the server's Meta key can see and a one-way
// fingerprint (never the key) so we can tell "wrong key" from "region/IP gating".
export async function GET() {
  const key = process.env.META_API_KEY ?? process.env.MODEL_API_KEY ?? process.env.LLAMA_API_KEY;
  const base = (process.env.META_BASE_URL ?? process.env.MODEL_API_BASE_URL ?? "https://api.meta.ai/v1").replace(/\/$/, "");
  const model = process.env.META_MODEL ?? process.env.MUSE_MODEL ?? "muse-spark-1.3";
  if (!key) return NextResponse.json({ ok: false, hasKey: false, base, model });

  const fp = createHash("sha256").update(key).digest("hex").slice(0, 16);
  const out: Record<string, unknown> = { hasKey: true, keyLen: key.length, keyFp: fp, base, model };

  try {
    const r = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${key}` } });
    const text = await r.text();
    let models: string[] | undefined;
    try { models = JSON.parse(text).data?.map((m: { id: string }) => m.id); } catch { /* non-json */ }
    out.models = { status: r.status, count: models?.length ?? null, ids: models?.slice(0, 25), snippet: models ? undefined : text.slice(0, 200) };
  } catch (e) { out.models = { error: (e as Error).message }; }

  try {
    const r = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "ok" }], max_tokens: 3 }),
    });
    const text = await r.text();
    out.chat = { status: r.status, snippet: text.slice(0, 200) };
  } catch (e) { out.chat = { error: (e as Error).message }; }

  return NextResponse.json(out);
}
