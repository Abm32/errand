"use client";

// One source of truth for the whole dashboard: mandate, ledger, the errand
// run/approve/settle handlers, vault linking, and live polling. The sidebar and
// every feature page (Overview / Errands / Standing / Activity) read it via
// useDash(), so state stays in sync across routes without refetching per page.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

export type Product = { id: string; title: string; priceCents: number; category: string; merchant: string; url: string };
export type Decision = { verdict: "auto_approve" | "needs_approval" | "deny"; reason: string };
export type Entry = { id: string; at: number; kind: string; summary: string; detail?: string; amountCents?: number; orderId?: string; captureId?: string; approveUrl?: string; proposalId?: string };
export type Mandate = {
  label: string; budgetCents: number; perItemCapCents: number; autoApproveUnderCents: number;
  allowedCategories?: string[]; blockedMerchants?: string[]; expiresAt?: number; vaultId?: string; spentCents: number;
};

export const STEPS = ["Searching the catalog", "Reasoning with Meta Muse", "Screening against your Mandate"];
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

function useDashboardState() {
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

  // Poll the server ledger so autonomous runs + live spend appear with no action.
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      try {
        const d = await fetch("/api/ledger", { cache: "no-store" }).then((r) => r.json());
        if (!alive) return;
        if (Array.isArray(d.entries)) setLedger(d.entries as Entry[]);
        if (d.mandate && mandateId === "md_demo") setMandate(d.mandate as Mandate);
      } catch { /* transient */ }
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
  const liveAutonomy = ledger.some((e) => Date.now() - e.at < 180_000 && /scheduled/i.test(e.summary ?? ""));
  const settledCount = ledger.filter((e) => e.kind === "purchased").length;
  const deniedCount = ledger.filter((e) => e.kind === "denied").length;
  const pct = mandate.budgetCents > 0 ? Math.min(1, mandate.spentCents / mandate.budgetCents) : 0;
  const meterColor = pct > 0.85 ? "#f43f5e" : pct > 0.6 ? "#f59e0b" : "#3b7dff";
  const badge = (v: string) =>
    v === "auto_approve" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
    : v === "needs_approval" ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
    : "bg-rose-500/15 text-rose-300 border-rose-500/40";

  return {
    mandate, mandateId, goal, setGoal, busy, thinking, step, reply, pick, decision, proposalId, approveUrl,
    vaultSetupId, considered, ledger, reduce, booting,
    run, approve, complete, linkWallet, finishLink, preset, reset, onCap, pushCaps,
    remaining, settled, liveAutonomy, settledCount, deniedCount, pct, meterColor, badge,
  };
}

const DashCtx = createContext<ReturnType<typeof useDashboardState> | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const value = useDashboardState();
  return <DashCtx.Provider value={value}>{children}</DashCtx.Provider>;
}

export function useDash() {
  const v = useContext(DashCtx);
  if (!v) throw new Error("useDash must be used within DashboardProvider");
  return v;
}
