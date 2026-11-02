"use client";

// Marketing landing for Gofer. Sells the idea and shows what happens inside;
// the CTA opens the real product at /dashboard (no login — hackathon speed).

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from "framer-motion";
import { ShieldCheck, Sparkles, Wallet, Search, Cpu, CreditCard, ArrowRight } from "lucide-react";
import { SPRING, Aurora, LogoMark, AgentOrb, SectionHead, Splash } from "./kit";

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#inside", label: "Inside" },
  { href: "#tech", label: "Built with" },
] as const;

export default function Landing() {
  const reduce = useReducedMotion();
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>{booting && <Splash reduce={!!reduce} />}</AnimatePresence>
      <main className="relative min-h-screen overflow-hidden text-slate-100 selection:bg-[#3b7dff]/30">
        <Aurora />

        {/* Nav */}
        <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#070810]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <a href="#top" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff]">
              <LogoMark className="h-6 w-6" />
              <span className="text-sm font-semibold tracking-[-0.03em] text-white">gofer</span>
            </a>
            <div className="ml-2 hidden items-center gap-0.5 md:flex">
              {NAV.map((s) => (
                <a key={s.href} href={s.href}
                  className="rounded-full px-3 py-1.5 text-xs text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff]">
                  {s.label}
                </a>
              ))}
            </div>
            <Link href="/dashboard"
              className="group ml-auto inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-[#4d8bff] to-[#6a5bff] px-4 py-2 text-xs font-semibold text-white shadow-[0_6px_20px_-8px_rgba(106,91,255,0.8)] transition-shadow hover:shadow-[0_10px_28px_-8px_rgba(106,91,255,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070810]">
              Open dashboard <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </nav>

        <div id="top" className="relative mx-auto max-w-5xl px-4">
          {/* Hero */}
          <header className="flex min-h-[78vh] flex-col justify-center py-10">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={SPRING.stiff} className="flex items-center gap-2.5">
              <AgentOrb active reduce={!!reduce} />
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Agentic commerce, on a leash you hold</span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.smooth, delay: 0.05 }}
              className="mt-8 max-w-3xl text-[2.7rem] font-semibold leading-[1.03] tracking-[-0.03em] text-white sm:text-[4rem]">
              An agent that spends your money —{" "}
              <span className="bg-gradient-to-r from-[#8fb6ff] to-[#b3a7ff] bg-clip-text text-transparent">and can&apos;t overspend.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.smooth, delay: 0.12 }}
              className="mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
              Gofer is an AI shopping agent wrapped in a <span className="text-slate-200">server-enforced Mandate</span>. Set a budget and caps once; it finds the buy and settles hands-free through PayPal — small buys clear, big ones wait for a tap, anything out of bounds is denied.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING.smooth, delay: 0.18 }}
              className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/dashboard"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#4d8bff] to-[#6a5bff] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(106,91,255,0.85)] transition-shadow hover:shadow-[0_14px_38px_-8px_rgba(106,91,255,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070810]">
                Open the dashboard <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a href="#how"
                className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.03] px-6 py-3.5 text-sm font-medium text-slate-200 backdrop-blur transition-colors hover:border-white/[0.25] hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff]">
                See how it works
              </a>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
              {["Reasons on Meta Muse", "Settles via real PayPal (sandbox)", "Shops Channel3", "No login — jump straight in"].map((t, i) => (
                <span key={t} className="flex items-center gap-2">
                  {i > 0 && <span className="text-slate-700">·</span>}
                  <span className="text-slate-400">{t}</span>
                </span>
              ))}
            </motion.div>
          </header>

          {/* Pillars */}
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              [ShieldCheck, "Server-enforced Mandate", "Budget, caps, categories and the running spend live on the server — the agent can't exceed them, and the client can't fake them."],
              [Sparkles, "Reasons with Meta Muse", "A real model searches the catalog and picks the best buy within your limits — or abstains when nothing fits."],
              [Wallet, "Real PayPal settlement", "Every charge is a real PayPal capture via Orders v2 + Vault v3 — hands-free once your wallet's linked."],
            ] as const).map(([Icon, t, d], i) => (
              <motion.div key={t} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ ...SPRING.smooth, delay: i * 0.06 }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 backdrop-blur">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-[#4d8bff]/30 bg-[#4d8bff]/10 text-[#8fb6ff]">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <p className="mt-3 text-sm font-semibold text-white">{t}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{d}</p>
              </motion.div>
            ))}
          </div>

          {/* How it works — cards jump INTO the dashboard */}
          <SectionHead id="how" className="mt-24" eyebrow="How it works" title="Two ways to use Gofer — one leash"
            desc="Send a one-off errand, or set standing errands that run themselves. Both pass the same server-enforced Mandate. Each step opens the live dashboard." />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {([
              ["01", "Grant a mandate", "Budget, per-item cap, categories, blocked merchants — on the server, so the agent can't exceed it.", "/dashboard#mandate"],
              ["02", "Send an errand", "Gofer searches real products and reasons with Meta Muse to pick the best buy within your limits.", "/dashboard#try"],
              ["03", "Approve → PayPal settles", "Small buys clear automatically; bigger ones wait for one tap. Every charge is a real PayPal capture, logged.", "/dashboard#activity"],
              ["04", "Or let it run itself", "Standing errands fire on a schedule and settle hands-free — still bound by the mandate, denied the instant the budget's spent.", "/dashboard#autonomous"],
            ] as const).map(([n, t, d, href], i) => (
              <motion.div key={n} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ ...SPRING.smooth, delay: i * 0.06 }}>
                <Link href={href}
                  className="group flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:border-[#4d8bff]/40 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff]">
                  <span className="font-mono text-xs text-[#8fb6ff]">{n}</span>
                  <h3 className="mt-2 flex items-center gap-1 text-sm font-semibold text-white">{t}<ArrowRight size={13} className="text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-[#8fb6ff]" /></h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{d}</p>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* A peek inside — the flow + a sample ledger */}
          <SectionHead id="inside" className="mt-24" eyebrow="A peek inside" title="What happens on every errand"
            desc="One goal flows through four stages and a single server-side gate before any money moves. Here's the path — and a sample of the audit trail you'll watch live in the dashboard." />
          <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
            {/* Pipeline */}
            <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={SPRING.smooth}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur">
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-slate-400">The agent loop</p>
              <ol className="space-y-3">
                {([
                  [Search, "Search", "Channel3 returns real, buyable products for the goal."],
                  [Cpu, "Reason", "Meta Muse picks the cheapest on-goal item — or abstains."],
                  [ShieldCheck, "Screen", "The Mandate gate runs deny-first: amount, expiry, merchant, category, per-item cap, budget."],
                  [CreditCard, "Settle", "Auto-approve → vaulted PayPal order settles COMPLETED on create. Over the limit → one tap. Out of bounds → denied."],
                ] as const).map(([Icon, t, d], i) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#4d8bff]/30 bg-[#4d8bff]/10 text-[#8fb6ff]">
                      <Icon size={16} strokeWidth={2} />
                    </span>
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium text-white">
                        <span className="font-mono text-[11px] text-slate-500">{String(i + 1).padStart(2, "0")}</span>{t}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-4 rounded-lg border border-[#4d8bff]/20 bg-[#4d8bff]/[0.06] px-3 py-2 text-[11px] leading-relaxed text-[#b9c7ff]">
                The spending path calls PayPal directly — nothing can route around the single <span className="font-mono">screen()</span> gate.
              </p>
            </motion.div>

            {/* Sample ledger */}
            <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ ...SPRING.smooth, delay: 0.08 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur">
              <p className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Sample activity ledger
                <span className="ml-auto flex items-center gap-1.5 normal-case tracking-normal text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> live in dashboard
                </span>
              </p>
              <div className="space-y-2 font-mono text-xs">
                {([
                  ["auto", "Bought Organic Coffee · $10.35", "PayPal ✓", "text-emerald-300", "border-emerald-500/30 bg-emerald-500/[0.08]"],
                  ["appr", "Planter $39 · awaiting one tap", "needs approval", "text-amber-300", "border-amber-500/30 bg-amber-500/[0.08]"],
                  ["deny", "$18.90 exceeds remaining $3.14", "blocked by mandate", "text-rose-300", "border-rose-500/30 bg-rose-500/[0.08]"],
                  ["abst", "No on-goal match — abstained", "bought nothing", "text-slate-300", "border-white/[0.08] bg-white/[0.03]"],
                  ["sys", "Server booted — $46.86 carried", "durable on disk", "text-[#b9aeff]", "border-[#6a5bff]/30 bg-[#6a5bff]/[0.08]"],
                ] as const).map(([k, left, right, tone, chip]) => (
                  <div key={k} className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${chip}`}>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase ${tone}`}>{k}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-200">{left}</span>
                    <span className={`shrink-0 ${tone}`}>{right}</span>
                  </div>
                ))}
              </div>
              <Link href="/dashboard#activity" className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#8fb6ff] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff] rounded">
                Watch it live <ArrowRight size={13} />
              </Link>
            </motion.div>
          </div>

          {/* Tech */}
          <SectionHead id="tech" className="mt-24" eyebrow="Built with" title="Real sponsor tools, end to end"
            desc="No mocks on the live deploy — real PayPal, a real catalog, a real model, a durable store." />
          <div className="mt-6 flex flex-wrap gap-2">
            {["PayPal Orders v2", "PayPal Vault v3", "Meta Muse (Baseten)", "Channel3", "AI SDK", "Next.js 16", "React 19", "Tailwind v4", "AG Grid", "Bryntum Gantt", "Render (disk)"].map((t) => (
              <span key={t} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300">{t}</span>
            ))}
          </div>

          {/* Final CTA */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={SPRING.smooth}
            className="mt-24 overflow-hidden rounded-3xl border border-[#4d8bff]/25 bg-gradient-to-br from-[#4d8bff]/[0.12] to-[#6a5bff]/[0.12] p-8 text-center backdrop-blur sm:p-12">
            <h2 className="mx-auto max-w-xl text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">Give an agent your card — safely.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-slate-300">Open the dashboard and watch it shop, settle, and get denied at the cap — all bounded by a mandate it can&apos;t break.</p>
            <Link href="/dashboard"
              className="group mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#4d8bff] to-[#6a5bff] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_34px_-8px_rgba(106,91,255,0.9)] transition-shadow hover:shadow-[0_16px_42px_-8px_rgba(106,91,255,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070810]">
              Open the dashboard <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          {/* Footer */}
          <footer className="mt-16 flex flex-col items-center gap-3 border-t border-white/[0.06] py-8 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-2 text-sm">
              <LogoMark className="h-5 w-5" />
              <span className="font-semibold tracking-tight text-slate-200">gofer</span>
              <span className="hidden text-slate-600 sm:inline">· agentic commerce, on a leash you hold</span>
            </div>
            <span className="text-xs text-slate-500">PayPal AI Hackathon 2026 · MIT</span>
          </footer>
        </div>
      </main>
    </MotionConfig>
  );
}
