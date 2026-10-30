"use client";

import { useEffect, useRef, useState } from "react";

type Product = { id: string; title: string; priceCents: number; category: string; merchant: string; url: string };
type Decision = { verdict: "auto_approve" | "needs_approval" | "deny"; reason: string };
type Entry = { id: string; at: number; kind: string; summary: string; detail?: string; amountCents?: number; orderId?: string; captureId?: string; approveUrl?: string; proposalId?: string };
type Mandate = {
  label: string; budgetCents: number; perItemCapCents: number; autoApproveUnderCents: number;
  allowedCategories?: string[]; blockedMerchants?: string[]; expiresAt?: number; spentCents: number;
};

const dollars = (c: number) => `$${(c / 100).toFixed(2)}`;

const DEFAULT = {
  label: "Mom's birthday gift",
  budgetCents: 5000,
  perItemCapCents: 4000,
  autoApproveUnderCents: 2000,
  allowedCategories: ["gardening", "books"],
  blockedMerchants: [] as string[],
};

// Config we can replay to recreate a mandate if the server instance recycled
// (the in-memory store lost it). Spent resets, which is fine for a demo and far
// better than a hard 404 mid-flow.
const configOf = (m: Mandate) => ({
  label: m.label, budgetCents: m.budgetCents, perItemCapCents: m.perItemCapCents,
  autoApproveUnderCents: m.autoApproveUnderCents, allowedCategories: m.allowedCategories,
  blockedMerchants: m.blockedMerchants, expiresAt: m.expiresAt,
});

export default function Home() {
  const [mandateId, setMandateId] = useState<string | null>(null);
  const [mandate, setMandate] = useState<Mandate>({ ...DEFAULT, spentCents: 0 });
  const [goal, setGoal] = useState("Find a birthday gift for my mom who loves gardening, under $40");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [pick, setPick] = useState<Product | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [approveUrl, setApproveUrl] = useState<string | null>(null);
  const [considered, setConsidered] = useState<Product[]>([]);
  const [ledger, setLedger] = useState<Entry[]>([]);
  const created = useRef(false);

  // Create the mandate on the server once; the browser only holds its id.
  useEffect(() => {
    if (created.current) return;
    created.current = true;
    fetch("/api/mandate", { method: "POST", body: JSON.stringify(DEFAULT) })
      .then((r) => r.json())
      .then((d) => { setMandateId(d.mandateId); setMandate(d.mandate); });
  }, []);

  // Recreate the mandate from our local config if the server lost it (instance
  // recycled). Returns a fresh mandateId; spent restarts at 0.
  async function recreate(): Promise<string | null> {
    const r = await fetch("/api/mandate", { method: "POST", body: JSON.stringify(configOf(mandate)) });
    const d = await r.json();
    if (!d.mandateId) return null;
    setMandateId(d.mandateId); setMandate(d.mandate);
    return d.mandateId;
  }

  async function pushCaps(patch: Partial<Mandate>) {
    if (!mandateId) return;
    const next = { ...mandate, ...patch };
    setMandate(next); // optimistic
    const r = await fetch("/api/mandate", { method: "POST", body: JSON.stringify({ mandateId, ...next }) });
    const d = await r.json();
    if (d.mandate) setMandate(d.mandate);
  }

  const onCap = (k: keyof Mandate, v: string) => pushCaps({ [k]: Math.round(parseFloat(v || "0") * 100) } as Partial<Mandate>);

  async function run(g: string = goal) {
    if (!mandateId) return;
    setBusy(true); setReply(""); setPick(null); setDecision(null); setConsidered([]); setProposalId(null); setApproveUrl(null);
    try {
      let id: string | null = mandateId;
      let res = await fetch("/api/agent", { method: "POST", body: JSON.stringify({ goal: g, mandateId: id }) });
      if (res.status === 404) { // server lost the mandate — recreate and retry once
        id = await recreate();
        if (id) res = await fetch("/api/agent", { method: "POST", body: JSON.stringify({ goal: g, mandateId: id }) });
      }
      const d = await res.json();
      setConsidered(d.considered ?? []);
      setPick(d.pick ?? null);
      setDecision(d.decision ?? null);
      setProposalId(d.proposalId ?? null);
      setApproveUrl(d.approveUrl ?? null);
      setLedger((l) => [...(d.entries ?? []), ...l]);
      if (d.mandate) setMandate(d.mandate);
      setReply(d.settled ? `✅ Purchased ${d.pick?.title ?? pick?.title}. PayPal order ${d.order?.id}${d.order?.mock ? " (sandbox mock)" : ""}.` : (d.reply ?? d.error ?? ""));
    } finally { setBusy(false); }
  }

  // Human approves a needs_approval proposal → create the PayPal order.
  async function approve() {
    if (!proposalId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/agent", { method: "PUT", body: JSON.stringify({ proposalId }) });
      const d = await res.json();
      setLedger((l) => [...(d.entries ?? []), ...l]);
      if (d.mandate) setMandate(d.mandate);
      if (d.settled) { // mock settles immediately
        setReply(`✅ Purchased ${pick?.title}. PayPal order ${d.order?.id}${d.order?.mock ? " (sandbox mock)" : ""}.`);
        setDecision(null); setPick(null); setProposalId(null); setApproveUrl(null);
      } else { // live sandbox: open PayPal for buyer approval, then capture
        setApproveUrl(d.approveUrl ?? null);
        setReply(d.error ?? "Order created. Approve it in PayPal, then complete the purchase.");
      }
    } finally { setBusy(false); }
  }

  // After the buyer approved the order in PayPal, capture (settle) it.
  async function complete() {
    if (!proposalId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/agent", { method: "PATCH", body: JSON.stringify({ proposalId }) });
      const d = await res.json();
      setLedger((l) => [...(d.entries ?? []), ...l]);
      if (d.mandate) setMandate(d.mandate);
      if (d.settled) {
        setReply(`✅ Purchased ${pick?.title}. PayPal order ${d.order?.id} settled.`);
        setDecision(null); setPick(null); setProposalId(null); setApproveUrl(null);
      } else {
        setReply(d.error ?? "Not settled yet — approve the order in PayPal first.");
      }
    } finally { setBusy(false); }
  }

  function preset(g: string) { setGoal(g); run(g); }

  async function reset() {
    setReply(""); setPick(null); setDecision(null); setConsidered([]); setProposalId(null); setLedger([]);
    const r = await fetch("/api/mandate", { method: "POST", body: JSON.stringify(DEFAULT) });
    const d = await r.json();
    if (d.mandateId) { setMandateId(d.mandateId); setMandate(d.mandate); }
  }

  const remaining = Math.max(0, mandate.budgetCents - mandate.spentCents);
  const pct = mandate.budgetCents > 0 ? Math.min(100, (mandate.spentCents / mandate.budgetCents) * 100) : 0;
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
            <span className="ml-auto rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
              {mandateId ? "mandate enforced server-side" : "connecting…"}
            </span>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[1fr_340px]">
          <section className="space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="mb-3 flex flex-wrap gap-2">
                {([
                  ["🎁 Auto-approved buy", "A cheap seed pack for the garden under $18"],
                  ["✋ Needs approval", "A nice planter for the garden around $40"],
                  ["⛔ Blocked by mandate", "A smart LED desk lamp"],
                ] as const).map(([label, g]) => (
                  <button key={label} onClick={() => preset(g)} disabled={busy || !mandateId}
                    className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300 hover:border-[#0070E0] disabled:opacity-50">
                    {label}
                  </button>
                ))}
                <button onClick={reset} disabled={busy}
                  className="ml-auto rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-50">
                  ↺ Reset demo
                </button>
              </div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">Send your agent on an errand</label>
              <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={2}
                className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-[#0070E0]" />
              <button onClick={() => run()} disabled={busy || !mandateId}
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
                    {approveUrl ? (
                      <div className="mt-3 space-y-2">
                        <a href={approveUrl} target="_blank" rel="noreferrer"
                          className="block w-full rounded-lg bg-[#0070E0] py-2 text-center text-sm font-semibold hover:bg-[#0059b3]">
                          Open PayPal to approve ↗
                        </a>
                        <button onClick={complete} disabled={busy}
                          className="block w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">
                          {busy ? "Settling…" : "I approved — complete purchase"}
                        </button>
                      </div>
                    ) : decision.verdict === "needs_approval" && proposalId ? (
                      <button onClick={approve} disabled={busy}
                        className="mt-3 block w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">
                        {busy ? "Paying…" : "Approve & pay with PayPal"}
                      </button>
                    ) : null}
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
                      <span className="truncate">{p.title} <span className="text-slate-500">· {p.merchant} · {p.category}</span></span>
                      <span className="shrink-0 pl-3 text-slate-300">{dollars(p.priceCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Mandate</p>
              <p className="mb-3 text-sm font-medium">{mandate.label}</p>
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full bg-[#0070E0] transition-all" style={{ width: `${pct}%` }} />
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
                    <input type="number" defaultValue={(mandate[k] as number) / 100} onBlur={(e) => onCap(k, e.target.value)}
                      className="w-20 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-right outline-none focus:border-[#0070E0]" />
                  </span>
                </label>
              ))}
              <label className="mt-2 block text-xs">
                <span className="text-slate-400">Allowed categories</span>
                <input
                  defaultValue={(mandate.allowedCategories ?? []).join(", ")}
                  onBlur={(e) => pushCaps({ allowedCategories: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="any category"
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-[#0070E0]" />
              </label>
              <label className="mt-2 block text-xs">
                <span className="text-slate-400">Blocked merchants</span>
                <input
                  defaultValue={(mandate.blockedMerchants ?? []).join(", ")}
                  onBlur={(e) => pushCaps({ blockedMerchants: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  placeholder="none"
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-[#0070E0]" />
              </label>
              <label className="mt-2 flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-400">Expires</span>
                <input type="date"
                  defaultValue={mandate.expiresAt ? new Date(mandate.expiresAt).toISOString().slice(0, 10) : ""}
                  onBlur={(e) => pushCaps({ expiresAt: e.target.value ? new Date(e.target.value + "T23:59:59").getTime() : undefined })}
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 outline-none focus:border-[#0070E0] [color-scheme:dark]" />
              </label>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                These limits and the amount spent live on the server. The agent cannot spend outside them — editing the numbers in the browser only changes your own mandate, it can&apos;t fake a purchase or the running total.
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
                      {e.orderId && <p className="text-[#4da3ff]">order {e.orderId}{e.captureId ? ` · capture ${e.captureId}` : ""}</p>}
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
