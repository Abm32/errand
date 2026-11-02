"use client";

// Errands (Workflow 1) — compose a one-off goal, set the mandate, run it, and
// watch the agent decide: buy, ask, deny, or abstain.

import { motion, AnimatePresence } from "framer-motion";
import { Wallet, ScanSearch } from "lucide-react";
import { SPRING, dollars, Spinner, StepIcon, SectionHead } from "../../kit";
import { useDash, STEPS } from "../DashboardProvider";

const PRESETS = [
  ["🎁 Auto-approved buy", "A cheap seed pack for the garden under $18"],
  ["✋ Needs approval", "A nice planter for the garden around $40"],
  ["⛔ Blocked by mandate", "A smart LED desk lamp"],
] as const;

export default function ErrandsPage() {
  const {
    mandate, mandateId, goal, setGoal, busy, thinking, step, reply, pick, decision, proposalId, approveUrl,
    vaultSetupId, considered, remaining, settled, pct, meterColor, badge,
    run, approve, complete, linkWallet, finishLink, preset, reset, onCap, pushCaps,
  } = useDash();

  return (
    <div className="mx-auto max-w-5xl">
      <SectionHead id="try" eyebrow="Workflow 1 · one-off"
        title="Send an errand"
        desc="Grant a Mandate on the right; hand the agent a goal in plain English on the left. Every pick is screened server-side before any money moves — buy, ask, deny, or abstain." />

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_360px] lg:gap-8">
        {/* LEFT — composer + live output */}
        <section className="space-y-5">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.smooth, delay: 0.05 }}
            className="premium-card relative rounded-2xl bg-white/[0.03] p-5 shadow-[0_26px_70px_-34px_rgba(106,91,255,0.55)] backdrop-blur">
            <div className="mb-3 flex flex-wrap gap-2">
              {PRESETS.map(([label, g]) => (
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
        <motion.aside initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.smooth, delay: 0.1 }} className="space-y-5">
          <div className="premium-card rounded-2xl bg-white/[0.03] p-5 backdrop-blur">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400"><Wallet size={13} strokeWidth={2.2} /> Mandate <span className="ml-auto rounded-full bg-[#4d8bff]/10 px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal text-[#8fb6ff]">the leash</span></p>
            <p className="mb-3 text-sm font-medium">{mandate.label}</p>
            <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div className="h-full origin-left rounded-full" style={{ backgroundColor: meterColor }} initial={false} animate={{ scaleX: pct }} transition={SPRING.smooth} />
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
    </div>
  );
}
