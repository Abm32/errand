"use client";

/*
  Gofer UI — choreography
  mount ........... header + panels settle in (stiff/smooth springs)
  run ............. agent orb spins up; thinking steps reveal one by one:
                    0ms   "Searching the catalog"      spinner → check
                    ~900  "Reasoning with Meta Muse"   spinner → check
                    ~1800 "Screening against Mandate"  spinner → (holds until response)
  response ........ steps all check, thinking card exits, result card springs in,
                    products stagger in, ledger entries slide in, budget meter springs
*/

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from "framer-motion";
import { ShieldCheck, Sparkles, Wallet, Receipt, ScanSearch } from "lucide-react";

// AG Grid is client-only; load it without SSR to avoid hydration mismatch.
const LedgerGrid = dynamic(() => import("./LedgerGrid"), { ssr: false });

type Product = { id: string; title: string; priceCents: number; category: string; merchant: string; url: string };
type Decision = { verdict: "auto_approve" | "needs_approval" | "deny"; reason: string };
type Entry = { id: string; at: number; kind: string; summary: string; detail?: string; amountCents?: number; orderId?: string; captureId?: string; approveUrl?: string; proposalId?: string };
type Mandate = {
  label: string; budgetCents: number; perItemCapCents: number; autoApproveUnderCents: number;
  allowedCategories?: string[]; blockedMerchants?: string[]; expiresAt?: number; vaultId?: string; spentCents: number;
};

const dollars = (c: number) => `$${(c / 100).toFixed(2)}`;

const SPRING = {
  snappy: { type: "spring", stiffness: 400, damping: 30 },
  smooth: { type: "spring", stiffness: 300, damping: 30 },
  bouncy: { type: "spring", stiffness: 280, damping: 26 },
  stiff: { type: "spring", stiffness: 350, damping: 28 },
} as const;

const STEPS = ["Searching the catalog", "Reasoning with Meta Muse", "Screening against your Mandate"];
const STEP_MS = 900;

const DEFAULT = {
  label: "Mom's birthday gift",
  budgetCents: 5000,
  perItemCapCents: 4000,
  autoApproveUnderCents: 2000,
  allowedCategories: ["gardening", "books"],
  blockedMerchants: [] as string[],
};

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
  const [thinking, setThinking] = useState(false);
  const [step, setStep] = useState(0);
  const [reply, setReply] = useState("");
  const [pick, setPick] = useState<Product | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [approveUrl, setApproveUrl] = useState<string | null>(null);
  const [vaultSetupId, setVaultSetupId] = useState<string | null>(null);
  const [considered, setConsidered] = useState<Product[]>([]);
  const [ledger, setLedger] = useState<Entry[]>([]);
  const created = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (created.current) return;
    created.current = true;
    // Prefer the durable demo mandate (survives cold starts, keeps its linked
    // wallet); fall back to minting a fresh one when none is seeded.
    fetch("/api/mandate")
      .then((r) => r.json())
      .then((d) => {
        if (d?.mandate) { setMandateId(d.mandateId); setMandate(d.mandate); return; }
        return fetch("/api/mandate", { method: "POST", body: JSON.stringify(DEFAULT) })
          .then((r) => r.json())
          .then((d) => { setMandateId(d.mandateId); setMandate(d.mandate); });
      })
      .catch(() => {});
  }, []);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

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
    setMandate(next);
    const r = await fetch("/api/mandate", { method: "POST", body: JSON.stringify({ mandateId, ...next }) });
    const d = await r.json();
    if (d.mandate) setMandate(d.mandate);
  }
  const onCap = (k: keyof Mandate, v: string) => pushCaps({ [k]: Math.round(parseFloat(v || "0") * 100) } as Partial<Mandate>);

  function startThinking() {
    setThinking(true); setStep(0);
    if (reduce) return; // no staged timer under reduced motion
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), STEP_MS);
  }
  function stopThinking() {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setStep(STEPS.length); // all done
    setTimeout(() => setThinking(false), reduce ? 0 : 420);
  }

  async function run(g: string = goal) {
    if (!mandateId || busy) return;
    setBusy(true); setReply(""); setPick(null); setDecision(null); setConsidered([]); setProposalId(null); setApproveUrl(null);
    startThinking();
    try {
      let id: string | null = mandateId;
      let res = await fetch("/api/agent", { method: "POST", body: JSON.stringify({ goal: g, mandateId: id }) });
      if (res.status === 404) { id = await recreate(); if (id) res = await fetch("/api/agent", { method: "POST", body: JSON.stringify({ goal: g, mandateId: id }) }); }
      const d = await res.json();
      stopThinking();
      setConsidered(d.considered ?? []);
      setPick(d.pick ?? null);
      setDecision(d.decision ?? null);
      setProposalId(d.proposalId ?? null);
      setApproveUrl(d.approveUrl ?? null);
      setLedger((l) => [...(d.entries ?? []), ...l]);
      if (d.mandate) setMandate(d.mandate);
      setReply(d.settled ? `Purchased ${d.pick?.title ?? pick?.title} — PayPal order ${d.order?.id}${d.order?.mock ? " (sandbox mock)" : ""}.` : (d.reply ?? d.error ?? ""));
    } catch { stopThinking(); setReply("Something went wrong. Try again."); }
    finally { setBusy(false); }
  }

  async function approve() {
    if (!proposalId || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/agent", { method: "PUT", body: JSON.stringify({ proposalId }) });
      const d = await res.json();
      setLedger((l) => [...(d.entries ?? []), ...l]);
      if (d.mandate) setMandate(d.mandate);
      if (d.settled) { setReply(`Purchased ${pick?.title} — PayPal order ${d.order?.id}${d.order?.mock ? " (sandbox mock)" : ""}.`); setDecision(null); setPick(null); setProposalId(null); setApproveUrl(null); }
      else { setApproveUrl(d.approveUrl ?? null); setReply(d.error ?? "Order created. Approve it in PayPal, then complete the purchase."); }
    } finally { setBusy(false); }
  }

  async function complete() {
    if (!proposalId || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/agent", { method: "PATCH", body: JSON.stringify({ proposalId }) });
      const d = await res.json();
      setLedger((l) => [...(d.entries ?? []), ...l]);
      if (d.mandate) setMandate(d.mandate);
      if (d.settled) { setReply(`Purchased ${pick?.title} — PayPal order ${d.order?.id} settled.`); setDecision(null); setPick(null); setProposalId(null); setApproveUrl(null); }
      else setReply(d.error ?? "Not settled yet — approve the order in PayPal first.");
    } finally { setBusy(false); }
  }

  // Vault: link a PayPal wallet once so auto-approved buys settle hands-free.
  async function linkWallet() {
    if (!mandateId) return;
    const r = await fetch("/api/vault", { method: "POST", body: JSON.stringify({ mandateId }) });
    const d = await r.json();
    if (d.approveUrl) { setVaultSetupId(d.setupTokenId); window.open(d.approveUrl, "_blank", "noopener"); }
  }
  async function finishLink() {
    if (!mandateId || !vaultSetupId) return;
    const r = await fetch("/api/vault", { method: "PUT", body: JSON.stringify({ mandateId, setupTokenId: vaultSetupId }) });
    const d = await r.json();
    if (d.mandate) { setMandate(d.mandate); setVaultSetupId(null); }
  }

  function preset(g: string) { setGoal(g); run(g); }
  async function reset() {
    setReply(""); setPick(null); setDecision(null); setConsidered([]); setProposalId(null); setApproveUrl(null); setLedger([]);
    const r = await fetch("/api/mandate", { method: "POST", body: JSON.stringify(DEFAULT) });
    const d = await r.json();
    if (d.mandateId) { setMandateId(d.mandateId); setMandate(d.mandate); }
  }

  const remaining = Math.max(0, mandate.budgetCents - mandate.spentCents);
  const settled = reply.startsWith("Purchased");
  const pct = mandate.budgetCents > 0 ? Math.min(1, mandate.spentCents / mandate.budgetCents) : 0;
  const meterColor = pct > 0.85 ? "#f43f5e" : pct > 0.6 ? "#f59e0b" : "#3b7dff";
  const badge = (v: string) =>
    v === "auto_approve" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
    : v === "needs_approval" ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
    : "bg-rose-500/15 text-rose-300 border-rose-500/40";

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative min-h-screen overflow-hidden text-slate-100 selection:bg-[#3b7dff]/30">
        {/* Aurora — drifting color fields behind everything */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
          <div className="aurora-blob drift-a" style={{ top: "-12%", right: "-6%", width: "48rem", height: "40rem", background: "radial-gradient(circle, rgba(59,125,255,0.45), transparent 62%)" }} />
          <div className="aurora-blob drift-b" style={{ bottom: "-18%", left: "-10%", width: "46rem", height: "40rem", background: "radial-gradient(circle, rgba(106,91,255,0.40), transparent 62%)" }} />
          <div className="aurora-blob drift-c" style={{ top: "28%", left: "38%", width: "34rem", height: "30rem", background: "radial-gradient(circle, rgba(143,182,255,0.18), transparent 60%)" }} />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 py-10">
          <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING.stiff} className="mb-9">
            <div className="flex items-center gap-2.5">
              <AgentOrb active={thinking} reduce={!!reduce} />
              <span className="text-lg font-semibold tracking-[-0.03em] text-white">gofer</span>
              <span className="ml-auto hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-slate-400 sm:flex">
                <span className={`h-1.5 w-1.5 rounded-full ${mandateId ? "bg-emerald-400" : "bg-slate-600"}`} />
                {mandateId ? "mandate enforced server-side" : "connecting…"}
              </span>
            </div>
            <div className="mt-8 max-w-2xl">
              <h1 className="text-[2.1rem] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-[2.6rem]">
                An agent that shops for you —{" "}
                <span className="bg-gradient-to-r from-[#8fb6ff] to-[#b3a7ff] bg-clip-text text-transparent">and can&apos;t overspend.</span>
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-400">
                Grant a mandate — budget, per-item cap, categories. Gofer reasons with Meta Muse, finds the buy, and settles through PayPal, strictly within your limits.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                {["Reasons on Meta Muse", "Settles via PayPal", "Shops Channel3"].map((t, i) => (
                  <span key={t} className="flex items-center gap-2">
                    {i > 0 && <span className="text-slate-700">·</span>}
                    <span className="text-slate-400">{t}</span>
                  </span>
                ))}
              </div>
            </div>
          </motion.header>

          {/* Feature band */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.smooth, delay: 0.12 }}
            className="mb-6 grid gap-3 sm:grid-cols-3">
            {([
              [ShieldCheck, "Server-enforced Mandate", "Budget, caps, categories — the agent can't exceed them."],
              [Sparkles, "Reasons with Meta Muse", "A real model picks the best buy within your limits."],
              [Wallet, "Real PayPal settlement", "Every charge is an actual capture — hands-free when vaulted."],
            ] as const).map(([Icon, t, d], i) => (
              <motion.div key={t} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.snappy, delay: 0.14 + i * 0.05 }}
                className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-3.5 backdrop-blur">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#4d8bff]/30 bg-[#4d8bff]/10 text-[#8fb6ff]">
                  <Icon size={16} strokeWidth={2} />
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{t}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{d}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid gap-6 md:grid-cols-[1fr_340px]">
            {/* LEFT */}
            <section className="space-y-5">
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.smooth, delay: 0.05 }}
                className="relative rounded-2xl border border-[#4d8bff]/25 bg-white/[0.03] p-5 shadow-[0_0_0_1px_rgba(77,139,255,0.08),0_26px_70px_-34px_rgba(106,91,255,0.55)] backdrop-blur">
                <div className="mb-3 flex flex-wrap gap-2">
                  {([
                    ["🎁 Auto-approved buy", "A cheap seed pack for the garden under $18"],
                    ["✋ Needs approval", "A nice planter for the garden around $40"],
                    ["⛔ Blocked by mandate", "A smart LED desk lamp"],
                  ] as const).map(([label, g]) => (
                    <motion.button key={label} onClick={() => preset(g)} disabled={busy || !mandateId}
                      whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} transition={SPRING.snappy}
                      className="rounded-full border border-white/[0.08] bg-black/25 px-3 py-1 text-xs text-slate-300 transition-colors hover:border-[#3b7dff] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff] disabled:opacity-40">
                      {label}
                    </motion.button>
                  ))}
                  <button onClick={reset} disabled={busy}
                    className="ml-auto rounded-full border border-transparent px-3 py-1 text-xs text-slate-500 transition-colors hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff] disabled:opacity-40">
                    ↺ Reset demo
                  </button>
                </div>
                <label htmlFor="goal" className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400"><ScanSearch size={13} strokeWidth={2.2} /> Send your agent on an errand</label>
                <textarea id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} rows={2}
                  className="w-full resize-none rounded-lg border border-white/[0.07] bg-black/30 p-3 text-sm outline-none transition-colors focus:border-[#3b7dff]" />
                <motion.button onClick={() => run()} disabled={busy || !mandateId}
                  whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }} transition={SPRING.snappy}
                  className="group mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-[#4d8bff] to-[#6a5bff] py-2.5 text-sm font-semibold shadow-[0_6px_20px_-6px_rgba(77,139,255,0.55)] transition-shadow hover:shadow-[0_10px_28px_-6px_rgba(106,91,255,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070810] disabled:opacity-50">
                  {busy ? <Spinner /> : <span aria-hidden className="transition-transform group-hover:translate-x-0.5">▸</span>}
                  {busy ? "Working…" : "Run errand"}
                </motion.button>
              </motion.div>

              {/* Thinking timeline */}
              <AnimatePresence mode="wait">
                {thinking && (
                  <motion.div key="thinking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={SPRING.smooth}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#8fb6ff]">Agent at work</p>
                    <ol className="space-y-2.5">
                      {STEPS.map((s, i) => {
                        const state = i < step ? "done" : i === step ? "active" : "pending";
                        return (
                          <li key={s} className="flex items-center gap-3 text-sm">
                            <StepIcon state={state} />
                            <span className={state === "pending" ? "text-slate-600" : state === "active" ? "text-slate-100" : "text-slate-400"}>
                              {s}{state === "active" ? "…" : ""}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Result */}
              <AnimatePresence>
                {reply && !thinking && (
                  <motion.div key="result" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={SPRING.bouncy}
                    className={`relative rounded-2xl border p-5 ${settled ? "border-emerald-500/40 bg-emerald-500/[0.06] shadow-[0_0_40px_-12px_rgba(16,185,129,0.5)]" : "border-white/[0.06] bg-white/[0.03]"}`}>
                    {settled && (
                      <div className="mb-3 flex items-center gap-2.5">
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING.bouncy}
                          className="grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-sm font-bold text-slate-950">✓</motion.span>
                        <span className="text-sm font-semibold text-emerald-300">Payment settled</span>
                      </div>
                    )}
                    <p className="text-sm text-slate-200">{reply}</p>
                    {pick && decision && (
                      <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/30 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{pick.title}</p>
                            <p className="text-xs text-slate-400">{pick.merchant} · {pick.category}</p>
                          </div>
                          <p className="font-mono text-lg font-semibold tabular-nums">{dollars(pick.priceCents)}</p>
                        </div>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING.bouncy}
                          className={`mt-3 inline-block rounded-md border px-2 py-1 text-xs ${badge(decision.verdict)}`}>
                          {decision.verdict.replace("_", " ")} — {decision.reason}
                        </motion.div>
                        {approveUrl ? (
                          <div className="mt-3 space-y-2">
                            <a href={approveUrl} target="_blank" rel="noreferrer"
                              className="block w-full rounded-lg bg-gradient-to-b from-[#4d8bff] to-[#6a5bff] py-2 text-center text-sm font-semibold shadow-[0_6px_20px_-6px_rgba(77,139,255,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff]">
                              Open PayPal to approve ↗
                            </a>
                            <motion.button onClick={complete} disabled={busy} whileTap={{ scale: 0.99 }} transition={SPRING.snappy}
                              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50">
                              {busy && <Spinner dark />} {busy ? "Settling…" : "I approved — complete purchase"}
                            </motion.button>
                          </div>
                        ) : decision.verdict === "needs_approval" && proposalId ? (
                          <motion.button onClick={approve} disabled={busy} whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} transition={SPRING.snappy}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-slate-950 shadow-[0_6px_20px_-6px_rgba(16,185,129,0.7)] hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50">
                            {busy && <Spinner dark />} {busy ? "Paying…" : "Approve & pay with PayPal"}
                          </motion.button>
                        ) : null}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Considered */}
              <AnimatePresence>
                {considered.length > 0 && !thinking && (
                  <motion.div key="considered" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Products considered ({considered.length})</p>
                    <div className="space-y-2">
                      {considered.map((p, i) => (
                        <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SPRING.snappy, delay: i * 0.06 }}
                          className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2 text-sm">
                          <span className="truncate">{p.title} <span className="text-slate-500">· {p.merchant} · {p.category}</span></span>
                          <span className="shrink-0 pl-3 font-mono tabular-nums text-slate-300">{dollars(p.priceCents)}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400"><Receipt size={13} strokeWidth={2.2} /> Activity ledger <span className="ml-auto normal-case tracking-normal text-slate-500">sortable · filterable</span></p>
                <LedgerGrid rows={ledger} />
              </div>
            </section>

            {/* RIGHT */}
            <motion.aside initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.smooth, delay: 0.1 }} className="space-y-5">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400"><Wallet size={13} strokeWidth={2.2} /> Mandate</p>
                <p className="mb-3 text-sm font-medium">{mandate.label}</p>
                <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                  <motion.div className="h-full origin-left rounded-full" style={{ backgroundColor: meterColor }}
                    initial={false} animate={{ scaleX: pct }} transition={SPRING.smooth} />
                </div>
                <p className="mb-4 text-xs text-slate-400">
                  <span className="font-mono tabular-nums text-slate-200">{dollars(mandate.spentCents)}</span> spent ·{" "}
                  <span className="font-mono tabular-nums text-slate-200">{dollars(remaining)}</span> left
                </p>
                {([
                  ["budgetCents", "Total budget"],
                  ["perItemCapCents", "Per-item cap"],
                  ["autoApproveUnderCents", "Auto-approve under"],
                ] as const).map(([k, label]) => (
                  <label key={k} className="mb-2 flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400">{label}</span>
                    <span className="flex items-center gap-1">
                      <span className="text-slate-500">$</span>
                      <input type="number" aria-label={label} defaultValue={(mandate[k] as number) / 100} onBlur={(e) => onCap(k, e.target.value)}
                        className="w-20 rounded border border-white/[0.07] bg-black/30 px-2 py-1 text-right font-mono tabular-nums outline-none transition-colors focus:border-[#3b7dff]" />
                    </span>
                  </label>
                ))}
                <label className="mt-2 block text-xs">
                  <span className="text-slate-400">Allowed categories</span>
                  <input defaultValue={(mandate.allowedCategories ?? []).join(", ")} aria-label="Allowed categories"
                    onBlur={(e) => pushCaps({ allowedCategories: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    placeholder="any category"
                    className="mt-1 w-full rounded border border-white/[0.07] bg-black/30 px-2 py-1 outline-none transition-colors focus:border-[#3b7dff]" />
                </label>
                <label className="mt-2 block text-xs">
                  <span className="text-slate-400">Blocked merchants</span>
                  <input defaultValue={(mandate.blockedMerchants ?? []).join(", ")} aria-label="Blocked merchants"
                    onBlur={(e) => pushCaps({ blockedMerchants: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                    placeholder="none"
                    className="mt-1 w-full rounded border border-white/[0.07] bg-black/30 px-2 py-1 outline-none transition-colors focus:border-[#3b7dff]" />
                </label>
                <label className="mt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">Expires</span>
                  <input type="date" aria-label="Mandate expiry"
                    defaultValue={mandate.expiresAt ? new Date(mandate.expiresAt).toISOString().slice(0, 10) : ""}
                    onBlur={(e) => pushCaps({ expiresAt: e.target.value ? new Date(e.target.value + "T23:59:59").getTime() : undefined })}
                    className="rounded border border-white/[0.07] bg-black/30 px-2 py-1 outline-none transition-colors focus:border-[#3b7dff] [color-scheme:dark]" />
                </label>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                  Limits and spend live on the server. The agent can&apos;t spend outside them — editing the numbers only changes your own mandate, never a purchase or the running total.
                </p>

                <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/20 p-3">
                  {mandate.vaultId ? (
                    <p className="flex items-center gap-2 text-xs text-emerald-300">
                      <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-500/20 text-[10px]">✓</span>
                      Wallet linked — auto-approved buys settle hands-free.
                    </p>
                  ) : vaultSetupId ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-400">Approve the wallet in the PayPal window, then:</p>
                      <button onClick={finishLink}
                        className="w-full rounded-lg bg-emerald-500 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
                        I authorized — finish linking
                      </button>
                    </div>
                  ) : (
                    <button onClick={linkWallet} disabled={!mandateId}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#4d8bff]/30 bg-[#4d8bff]/10 py-1.5 text-xs font-medium text-[#8fb6ff] transition-colors hover:bg-[#4d8bff]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff] disabled:opacity-40">
                      ⚡ Link PayPal wallet — settle hands-free
                    </button>
                  )}
                </div>
              </div>
            </motion.aside>
          </div>

          {/* How it works */}
          <section className="mt-16">
            <p className="mb-5 text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-500">How it works</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {([
                ["01", "Grant a mandate", "Set a budget, a per-item cap, allowed categories and blocked merchants. It lives on the server — the agent can't exceed it."],
                ["02", "The agent works", "Gofer searches real products and reasons with Meta Muse to pick the best buy within your limits."],
                ["03", "Approve → PayPal settles", "Small buys clear automatically; bigger ones wait for one tap. Every charge is a real PayPal capture, logged."],
              ] as const).map(([n, t, d], i) => (
                <motion.div key={n} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ ...SPRING.smooth, delay: i * 0.06 }}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <span className="font-mono text-xs text-[#8fb6ff]">{n}</span>
                  <h3 className="mt-2 text-sm font-semibold text-white">{t}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{d}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-16 flex flex-col items-center gap-3 border-t border-white/[0.06] pt-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-2 text-sm">
              <LogoMark className="h-5 w-5" />
              <span className="font-semibold tracking-tight text-slate-200">gofer</span>
              <span className="hidden text-slate-600 sm:inline">· agentic commerce, on a leash you hold</span>
            </div>
            <div className="flex items-center gap-x-2.5 text-xs text-slate-500">
              <span>Meta Muse</span><span className="text-slate-700">·</span>
              <span>PayPal</span><span className="text-slate-700">·</span>
              <span>Channel3</span><span className="text-slate-700">·</span>
              <span>Next.js</span>
            </div>
          </footer>
        </div>
      </main>
    </MotionConfig>
  );
}

function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden>
      <defs>
        <linearGradient id="gofer-g" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4d8bff" />
          <stop offset="1" stopColor="#6a5bff" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#gofer-g)" />
      <rect x="2.6" y="2.6" width="42.8" height="42.8" rx="11.4" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="1.2" />
      <circle cx="15" cy="24" r="3.1" fill="#fff" />
      <path d="M19 24H31" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <path d="M26 18.5 31.5 24 26 29.5" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AgentOrb({ active, reduce }: { active: boolean; reduce: boolean }) {
  return (
    <div className="relative grid h-11 w-11 place-items-center">
      {/* soft brand glow */}
      <span aria-hidden className="absolute inset-0 rounded-[13px] bg-[#4d8bff]/30 blur-lg" />
      {active && !reduce && (
        <motion.span aria-hidden className="absolute -inset-[3px] rounded-[15px]"
          style={{ background: "conic-gradient(from 0deg, #4d8bff, #8fb6ff, #6a5bff, #4d8bff)" }}
          animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1.8 }} />
      )}
      <motion.div className="relative"
        animate={active && !reduce ? { scale: [1, 1.07, 1] } : { scale: 1 }}
        transition={active ? { repeat: Infinity, duration: 1.2, ease: "easeInOut" } : SPRING.snappy}>
        <LogoMark className="h-10 w-10 drop-shadow-[0_6px_14px_rgba(77,139,255,0.45)]" />
      </motion.div>
    </div>
  );
}

function Spinner({ dark }: { dark?: boolean }) {
  return (
    <motion.span aria-hidden className={`inline-block h-3.5 w-3.5 rounded-full border-2 ${dark ? "border-slate-900/40 border-t-slate-900" : "border-white/40 border-t-white"}`}
      animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 0.7 }} />
  );
}

function StepIcon({ state }: { state: "done" | "active" | "pending" }) {
  if (state === "done") return (
    <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING.bouncy}
      className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/20 text-emerald-300">✓</motion.span>
  );
  if (state === "active") return (
    <span className="grid h-5 w-5 place-items-center">
      <motion.span aria-hidden className="h-3.5 w-3.5 rounded-full border-2 border-[#3b7dff]/40 border-t-[#8fb6ff]"
        animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 0.7 }} />
    </span>
  );
  return <span className="grid h-5 w-5 place-items-center"><span className="h-1.5 w-1.5 rounded-full bg-white/25" /></span>;
}
