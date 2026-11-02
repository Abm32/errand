"use client";

// Overview — the dashboard home. Greets the user, shows live mandate stats, and
// routes into the three feature pages.

import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingBag, CalendarClock, Receipt, ArrowRight } from "lucide-react";
import { SPRING, dollars } from "../kit";
import { useDash } from "./DashboardProvider";

const KIND_TONE: Record<string, string> = {
  purchased: "text-emerald-300", verified: "text-emerald-300",
  denied: "text-rose-300", awaiting_approval: "text-amber-300",
  recommend: "text-[#8fb6ff]", search: "text-slate-400", system: "text-[#b9aeff]",
};

export default function Overview() {
  const { mandate, remaining, settledCount, deniedCount, liveAutonomy, ledger, pct, meterColor } = useDash();

  const stats = [
    { label: "Daily allowance", value: dollars(mandate.budgetCents) },
    { label: "Spent", value: dollars(mandate.spentCents) },
    { label: "Remaining", value: dollars(remaining) },
    { label: "Settlements", value: String(settledCount) },
    { label: "Denied at cap", value: String(deniedCount) },
  ];

  const quick = [
    { href: "/dashboard/errands", label: "Send an errand", desc: "Compose a goal; the agent buys the best fit within your mandate.", Icon: ShoppingBag, tag: "Workflow 1" },
    { href: "/dashboard/standing", label: "Standing errands", desc: "Recurring, mandate-bound jobs that fire and settle hands-free.", Icon: CalendarClock, tag: "Workflow 2" },
    { href: "/dashboard/activity", label: "Activity ledger", desc: "Every move the agent made — searches, buys, denials, abstains.", Icon: Receipt, tag: "Audit trail" },
  ];

  const recent = ledger.slice(0, 6);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Hello */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING.stiff}>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8fb6ff]">Welcome back</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">Hello 👋</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
          Your agent is {liveAutonomy ? "running autonomously right now" : "standing by"} — spending in real PayPal, bounded by a mandate it can&apos;t break.
        </p>
      </motion.div>

      {/* Stat tiles */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.smooth, delay: 0.04 * i }}
            className="premium-card rounded-2xl bg-white/[0.03] p-4 backdrop-blur">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-white">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Allowance meter */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.smooth, delay: 0.1 }}
        className="premium-card mt-3 rounded-2xl bg-white/[0.03] p-5 backdrop-blur">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{mandate.label} · allowance used</span>
          <span className="font-mono tabular-nums text-slate-200">{Math.round(pct * 100)}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/[0.07]">
          <motion.div className="h-full origin-left rounded-full" style={{ backgroundColor: meterColor }} initial={false} animate={{ scaleX: pct }} transition={SPRING.smooth} />
        </div>
      </motion.div>

      {/* Quick actions */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {quick.map(({ href, label, desc, Icon, tag }, i) => (
          <motion.div key={href} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.smooth, delay: 0.12 + i * 0.05 }}>
            <Link href={href}
              className="group flex h-full flex-col rounded-2xl premium-card bg-white/[0.025] p-5 backdrop-blur transition-shadow hover:shadow-[0_24px_70px_-34px_rgba(106,91,255,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff]">
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-[#4d8bff]/30 bg-[#4d8bff]/10 text-[#8fb6ff]"><Icon size={18} strokeWidth={2} /></span>
              <p className="mt-3 text-[10px] uppercase tracking-wide text-slate-500">{tag}</p>
              <h3 className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-white">{label}<ArrowRight size={13} className="text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-[#8fb6ff]" /></h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{desc}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Recent activity peek */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.smooth, delay: 0.2 }}
        className="premium-card mt-8 rounded-2xl bg-white/[0.03] p-5 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Recent activity</p>
          <Link href="/dashboard/activity" className="flex items-center gap-1 text-xs font-medium text-[#8fb6ff] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff] rounded">
            View all <ArrowRight size={13} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">No activity yet — send an errand or wait for a standing run.</p>
        ) : (
          <div className="space-y-1.5">
            {recent.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-black/20 px-3 py-2 text-sm">
                <span className={`shrink-0 text-[10px] uppercase ${KIND_TONE[e.kind] ?? "text-slate-400"}`}>{e.kind.replace("_", " ")}</span>
                <span className="min-w-0 flex-1 truncate text-slate-200">{e.summary}</span>
                {typeof e.amountCents === "number" && <span className="shrink-0 font-mono text-xs tabular-nums text-slate-300">{dollars(e.amountCents)}</span>}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
