"use client";

import { useState } from "react";

type Product = { id: string; title: string; priceCents: number; category: string; merchant: string; url: string };
type Decision = { verdict: "auto_approve" | "needs_approval" | "deny"; reason: string };
type Entry = { id: string; at: number; kind: string; summary: string; detail?: string; amountCents?: number; orderId?: string; approveUrl?: string };
type Mandate = {
  label: string; budgetCents: number; perItemCapCents: number; autoApproveUnderCents: number;
  allowedCategories?: string[]; spentCents: number;
};

const dollars = (c: number) => `$${(c / 100).toFixed(2)}`;

export default function Home() {
  const [mandate, setMandate] = useState<Mandate>({
    label: "Mom's birthday gift",
    budgetCents: 5000,
    perItemCapCents: 4000,
    autoApproveUnderCents: 2000,
    allowedCategories: ["gardening", "books"],
    spentCents: 0,
  });
  const [goal, setGoal] = useState("Find a birthday gift for my mom who loves gardening, under $40");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<string>("");
  const [pick, setPick] = useState<Product | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [considered, setConsidered] = useState<Product[]>([]);
  const [ledger, setLedger] = useState<Entry[]>([]);

  const setDollar = (k: keyof Mandate, v: string) =>
    setMandate((m) => ({ ...m, [k]: Math.round(parseFloat(v || "0") * 100) }));

  async function run() {
    setBusy(true); setReply(""); setPick(null); setDecision(null); setConsidered([]);
    try {
      const res = await fetch("/api/agent", { method: "POST", body: JSON.stringify({ goal, mandate }) });
      const d = await res.json();
      setReply(d.reply ?? d.error ?? "");
      setConsidered(d.considered ?? []);
      setPick(d.pick ?? null);
      setDecision(d.decision ?? null);
      setLedger((l) => [...(d.entries ?? []), ...l]);
      if (d.spentDeltaCents) setMandate((m) => ({ ...m, spentCents: m.spentCents + d.spentDeltaCents }));
    } finally { setBusy(false); }
  }

  async function approve() {
    if (!pick) return;
    setBusy(true);
    try {
      const res = await fetch("/api/agent", {
        method: "PUT",
        body: JSON.stringify({ mandate, pick: { title: pick.title, priceCents: pick.priceCents, category: pick.category, merchant: pick.merchant } }),
      });
      const d = await res.json();
      setLedger((l) => [...(d.entries ?? []), ...l]);
      if (d.spentDeltaCents) setMandate((m) => ({ ...m, spentCents: m.spentCents + d.spentDeltaCents }));
      setReply(d.error ?? `Purchased ${pick.title}. PayPal order ${d.order?.id}${d.order?.mock ? " (sandbox mock)" : ""}.`);
      setDecision(null); setPick(null);
    } finally { setBusy(false); }
  }

  const remaining = Math.max(0, mandate.budgetCents - mandate.spentCents);
  const badge = (v: string) =>
    v === "auto_approve" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : v === "needs_approval" ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
    : "bg-rose-500/15 text-rose-300 border-rose-500/30";

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0070E0] font-bold">E</div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Errand</h1>
              <p className="text-sm text-slate-400">An autonomous shopping agent that spends your money — only within a mandate you grant.</p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[1fr_340px]">
          {/* Left: agent */}
          <section className="space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">Send your agent on an errand</label>
              <textarea
                value={goal} onChange={(e) => setGoal(e.target.value)} rows={2}
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-[#0070E0]"
              />
              <button onClick={run} disabled={busy}
                className="mt-3 w-full rounded-lg bg-[#0070E0] py-2.5 text-sm font-semibold hover:bg-[#0059b3] disabled:opacity-50">
                {busy ? "Working…" : "Run errand"}
              </button>
            </div>

            {reply && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <p className="text-sm text-slate-200">{reply}</p>
                {pick && decision && (
                  <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{pick.title}</p>
                        <p className="text-xs text-slate-400">{pick.merchant} · {pick.category}</p>
                      </div>
                      <p className="text-lg font-semibold">{dollars(pick.priceCents)}</p>
                    </div>
                    <div className={`mt-3 inline-block rounded-md border px-2 py-1 text-xs ${badge(decision.verdict)}`}>
                      {decision.verdict.replace("_", " ")} — {decision.reason}
                    </div>
                    {decision.verdict === "needs_approval" && (
                      <button onClick={approve} disabled={busy}
                        className="mt-3 block w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">
                        Approve & pay with PayPal
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {considered.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Products considered ({considered.length})</p>
                <div className="space-y-2">
                  {considered.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm">
                      <span className="truncate">{p.title} <span className="text-slate-500">· {p.merchant}</span></span>
                      <span className="shrink-0 pl-3 text-slate-300">{dollars(p.priceCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Right: mandate + ledger */}
          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Mandate</p>
              <p className="mb-3 text-sm font-medium">{mandate.label}</p>
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full bg-[#0070E0]" style={{ width: `${(mandate.spentCents / mandate.budgetCents) * 100}%` }} />
              </div>
              <p className="mb-4 text-xs text-slate-400">{dollars(mandate.spentCents)} spent · {dollars(remaining)} left</p>
              {([
                ["budgetCents", "Total budget"],
                ["perItemCapCents", "Per-item cap"],
                ["autoApproveUnderCents", "Auto-approve under"],
              ] as const).map(([k, label]) => (
                <label key={k} className="mb-2 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">{label}</span>
                  <span className="flex items-center gap-1">
                    <span className="text-slate-500">$</span>
                    <input type="number" value={(mandate[k] as number) / 100} onChange={(e) => setDollar(k, e.target.value)}
                      className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-right outline-none focus:border-[#0070E0]" />
                  </span>
                </label>
              ))}
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                Allowed: {mandate.allowedCategories?.join(", ") || "any category"}. The agent cannot spend outside these limits.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Activity ledger</p>
              {ledger.length === 0 ? (
                <p className="text-xs text-slate-500">No activity yet. Run an errand.</p>
              ) : (
                <ol className="space-y-2">
                  {ledger.map((e) => (
                    <li key={e.id} className="border-l-2 border-slate-700 pl-3 text-xs">
                      <p className="text-slate-200">{e.summary}</p>
                      {e.detail && <p className="text-slate-500">{e.detail}</p>}
                      {e.orderId && <p className="text-[#4da3ff]">PayPal order {e.orderId}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
