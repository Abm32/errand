"use client";

// Shared presentational kit used by both the landing page (/) and the
// dashboard (/dashboard): motion springs, the logo, the agent orb, the section
// header, aurora backdrop, and the loading splash.

import { motion } from "framer-motion";

export const dollars = (c: number) => `$${(c / 100).toFixed(2)}`;

export const SPRING = {
  snappy: { type: "spring", stiffness: 400, damping: 30 },
  smooth: { type: "spring", stiffness: 300, damping: 30 },
  bouncy: { type: "spring", stiffness: 280, damping: 26 },
  stiff: { type: "spring", stiffness: 350, damping: 28 },
} as const;

export function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="aurora-blob drift-a" style={{ top: "-12%", right: "-6%", width: "48rem", height: "40rem", background: "radial-gradient(circle, rgba(59,125,255,0.45), transparent 62%)" }} />
      <div className="aurora-blob drift-b" style={{ bottom: "-18%", left: "-10%", width: "46rem", height: "40rem", background: "radial-gradient(circle, rgba(106,91,255,0.40), transparent 62%)" }} />
      <div className="aurora-blob drift-c" style={{ top: "28%", left: "38%", width: "34rem", height: "30rem", background: "radial-gradient(circle, rgba(143,182,255,0.18), transparent 60%)" }} />
    </div>
  );
}

export function LogoMark({ className = "" }: { className?: string }) {
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

export function AgentOrb({ active, reduce }: { active: boolean; reduce: boolean }) {
  return (
    <div className="relative grid h-11 w-11 place-items-center">
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

export function Spinner({ dark }: { dark?: boolean }) {
  return (
    <motion.span aria-hidden className={`inline-block h-3.5 w-3.5 rounded-full border-2 ${dark ? "border-slate-900/40 border-t-slate-900" : "border-white/40 border-t-white"}`}
      animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 0.7 }} />
  );
}

export function StepIcon({ state }: { state: "done" | "active" | "pending" }) {
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

// A consistent header for each section — eyebrow + title + one-line description.
export function SectionHead({ id, eyebrow, title, desc, className = "" }: { id?: string; eyebrow: string; title: string; desc?: string; className?: string }) {
  return (
    <motion.div id={id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={SPRING.smooth}
      className={`scroll-mt-24 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#8fb6ff]">{eyebrow}</p>
      <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">{title}</h2>
      {desc && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{desc}</p>}
    </motion.div>
  );
}

// Branded loading splash — render inside <AnimatePresence> gated by a booting flag.
export function Splash({ reduce }: { reduce: boolean }) {
  return (
    <motion.div key="splash" exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-[60] grid place-items-center bg-[#070810]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="aurora-blob drift-a" style={{ top: "20%", left: "40%", width: "30rem", height: "26rem", background: "radial-gradient(circle, rgba(77,139,255,0.35), transparent 62%)" }} />
      </div>
      <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={SPRING.smooth}
        className="flex flex-col items-center gap-5">
        <div className="scale-125"><AgentOrb active reduce={reduce} /></div>
        <span className="text-lg font-semibold tracking-[-0.03em] text-white">gofer</span>
        <div className="h-0.5 w-32 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#4d8bff] to-[#6a5bff]"
            animate={{ x: ["-120%", "320%"] }} transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }} />
        </div>
      </motion.div>
    </motion.div>
  );
}
