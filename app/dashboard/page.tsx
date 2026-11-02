"use client";

/*
  Gofer dashboard — the interactive product.
  mount ........... panels settle in (stiff/smooth springs)
  run ............. agent orb spins up; thinking steps reveal one by one
  response ........ result card springs in, products stagger, ledger slides in
  The marketing landing lives at / and its CTA opens this dashboard.
*/

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from "framer-motion";
import { Wallet, ScanSearch } from "lucide-react";
import { SPRING, dollars, Aurora, LogoMark, AgentOrb, Spinner, StepIcon, SectionHead, Splash } from "../kit";

const LedgerGrid = dynamic(() => import("../LedgerGrid"), { ssr: false });
const StandingGantt = dynamic(() => import("../StandingGantt"), { ssr: false });

type Product = { id: string; title: string; priceCents: number; category: string; merchant: string; url: string };
type Decision = { verdict: "auto_approve" | "needs_approval" | "deny"; reason: string };
type Entry = { id: string; at: number; kind: string; summary: string; detail?: string; amountCents?: number; orderId?: string; captureId?: string; approveUrl?: string; proposalId?: string };
type Mandate = {
  label: string; budgetCents: number; perItemCapCents: number; autoApproveUnderCents: number;
  allowedCategories?: string[]; blockedMerchants?: string[]; expiresAt?: number; vaultId?: string; spentCents: number;
};

const STEPS = ["Searching the catalog", "Reasoning with Meta Muse", "Screening against your Mandate"];
const STEP_MS = 900;

const SECTIONS = [
  { id: "try", label: "Errand" },
  { id: "activity", label: "Activity" },
  { id: "autonomous", label: "Autonomous" },
] as const;

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

export default function Dashboard() {
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
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    if (created.current) return;
    created.current = true;
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

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 800);
    return () => clearTimeout(t);
  }, []);

  // Poll the server ledger so autonomous (scheduled) runs and the live spend
  // appear without any user action — the agent visibly works on its own.
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const d = await fetch("/api/ledger", { cache: "no-store" }).then((r) => r.json());
        if (!alive) return;
        if (Array.isArray(d.entries)) setLedger(d.entries as Entry[]);
        if (d.mandate && mandateId === "md_demo") setMandate(d.mandate as Mandate);
      } catch { /* transient; try again next tick */ }
    };
    const h = setInterval(pull, 12000);
    pull();
    return () => { alive = false; clearInterval(h); };
  }, [mandateId]);

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
    if (reduce) return;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), STEP_MS);
  }
  function stopThinking() {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setStep(STEPS.length);
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
  const liveAutonomy = ledger.some(
    (e) => Date.now() - e.at < 180_000 && /scheduled/i.test(e.summary ?? ""),
  );
  const pct = mandate.budgetCents > 0 ? Math.min(1, mandate.spentCents / mandate.budgetCents) : 0;
  const meterColor = pct > 0.85 ? "#f43f5e" : pct > 0.6 ? "#f59e0b" : "#3b7dff";
  const badge = (v: string) =>
    v === "auto_approve" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
    : v === "needs_approval" ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
    : "bg-rose-500/15 text-rose-300 border-rose-500/40";

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>{booting && <Splash reduce={!!reduce} />}</AnimatePresence>
      <main className="relative min-h-screen overflow-hidden text-slate-100 selection:bg-[#3b7dff]/30">
        <Aurora />

        {/* Dashboard nav */}
        <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#070810]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff]">
              <LogoMark className="h-6 w-6" />
              <span className="text-sm font-semibold tracking-[-0.03em] text-white">gofer</span>
              <span className="rounded-full border border-white/[0.1] px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">dashboard</span>
            </Link>
            <div className="ml-2 hidden items-center gap-0.5 md:flex">
              {SECTIONS.map((s) => (
                <a key={s.id} href={`#${s.id}`}
                  className="rounded-full px-3 py-1.5 text-xs text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff]">
                  {s.label}
                </a>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <AnimatePresence>
                {liveAutonomy && (
                  <motion.span key="live" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={SPRING.snappy}
                    className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                    <span className="relative flex h-1.5 w-1.5">
                      <span aria-hidden className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                    <span className="hidden sm:inline">running autonomously</span>
                    <span className="sm:hidden">live</span>
                  </motion.span>
                )}
              </AnimatePresence>
              <span className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-slate-400 sm:flex">
                <span className={`h-1.5 w-1.5 rounded-full ${mandateId ? "bg-emerald-400" : "bg-slate-600"}`} />
                {mandateId ? "mandate enforced server-side" : "connecting…"}
              </span>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`}
                className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff]">
                {s.label}
              </a>
            ))}
          </div>
        </nav>

        <div className="relative mx-auto max-w-5xl px-4 py-8">
          {/* Compact dashboard intro */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING.stiff} className="mb-8 flex items-center gap-3">
            <AgentOrb active={thinking} reduce={!!reduce} />
            <div>
              <h1 className="text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">Dashboard</h1>
              <p className="text-sm text-slate-400">Your agent, your mandate — spending live, bounded server-side.</p>
            </div>
          </motion.div>

          {/* ===== Workflow 1 — set the leash + send a one-off errand ===== */}
          <SectionHead id="try" eyebrow="Workflow 1"
            title="Set the leash, then send an errand"
            desc="Grant a Mandate on the right; hand the agent a goal in plain English on the left. Every pick is screened server-side before any money moves — buy, ask, deny, or abstain." />
          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_360px] lg:gap-8">
            {/* LEFT — the errand composer + the agent's live output */}
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
            </section>

            {/* RIGHT — the mandate */}
            <motion.aside id="mandate" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.smooth, delay: 0.1 }} className="scroll-mt-24 space-y-5">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400"><Wallet size={13} strokeWidth={2.2} /> Mandate <span className="ml-auto rounded-full bg-[#4d8bff]/10 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-[#8fb6ff]">Step 1 · the leash</span></p>
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

          {/* ===== Activity ledger — full width ===== */}
          <SectionHead id="activity" className="mt-20" eyebrow="Audit trail"
            title="Activity ledger"
            desc="Every move the agent makes — searches, recommendations, approvals, denials, abstains, hands-free captures, and durability markers — written down and sortable." />
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={SPRING.smooth}
            className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
            <LedgerGrid rows={ledger} />
          </motion.div>

          {/* ===== Workflow 2 — standing errands ===== */}
          <SectionHead id="autonomous" className="mt-20" eyebrow="Workflow 2"
            title="Standing errands that run themselves"
            desc="Recurring, mandate-bound jobs fire autonomously on a schedule and settle hands-free — click any run to send it now." />
          <motion.section initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={SPRING.smooth}
            className="mt-6 rounded-2xl border border-[#4d8bff]/20 bg-white/[0.03] p-5 backdrop-blur">
            <div className="mb-3 flex items-center justify-end">
              <span className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-400" /> ran</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#4d8bff]" /> scheduled</span>
              </span>
            </div>
            <StandingGantt onRun={(g) => { preset(g); window.scrollTo({ top: 0, behavior: "smooth" }); }} disabled={busy || !mandateId} />
          </motion.section>

          {/* Footer */}
          <footer className="mt-16 flex flex-col items-center gap-3 border-t border-white/[0.06] pt-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <Link href="/" className="flex items-center gap-2 text-sm">
              <LogoMark className="h-5 w-5" />
              <span className="font-semibold tracking-tight text-slate-200">gofer</span>
              <span className="hidden text-slate-600 sm:inline">· back to site</span>
            </Link>
            <div className="flex items-center gap-x-2.5 text-xs text-slate-500">
              <span>Meta Muse</span><span className="text-slate-700">·</span>
              <span>PayPal</span><span className="text-slate-700">·</span>
              <span>Channel3</span><span className="text-slate-700">·</span>
              <span>Bryntum</span><span className="text-slate-700">·</span>
              <span>Next.js</span>
            </div>
          </footer>
        </div>
      </main>
    </MotionConfig>
  );
}
