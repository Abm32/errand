import { NextResponse } from "next/server";

// Diagnostic: reports what the server's Meta key can see, WITHOUT exposing the
// key. Tells us whether the configured model is available to this key.
export async function GET() {
  const key = process.env.META_API_KEY ?? process.env.MODEL_API_KEY ?? process.env.LLAMA_API_KEY;
  const base = (process.env.META_BASE_URL ?? process.env.MODEL_API_BASE_URL ?? "https://api.meta.ai/v1").replace(/\/$/, "");
  const model = process.env.META_MODEL ?? process.env.MUSE_MODEL ?? "muse-spark-1.3";
  if (!key) return NextResponse.json({ ok: false, hasKey: false, base, model });
  try {
    const r = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${key}` } });
    const text = await r.text();
    let models: string[] | undefined;
    try { models = JSON.parse(text).data?.map((m: { id: string }) => m.id); } catch { /* non-json */ }
    return NextResponse.json({
      ok: r.ok,
      status: r.status,
      hasKey: true,
      base,
      model,
      modelAvailable: models?.includes(model) ?? null,
      models: models?.slice(0, 25),
      bodySnippet: models ? undefined : text.slice(0, 200),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, hasKey: true, base, model, error: (e as Error).message });
  }
}
