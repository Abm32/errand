"use client";

// Dashboard app shell: a left side panel (feature nav + live mandate meter) and
// the main content area. Wraps everything in the shared DashboardProvider so the
// sidebar and every feature page read one source of truth.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionConfig, AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, ShoppingBag, CalendarClock, Receipt, ArrowUpRight } from "lucide-react";
import { Aurora, Splash, LogoMark, dollars, SPRING } from "../kit";
import { DashboardProvider, useDash } from "./DashboardProvider";

type NavItem = { href: string; label: string; tag: string; Icon: typeof LayoutDashboard; exact?: boolean };
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", tag: "Home", Icon: LayoutDashboard, exact: true },
  { href: "/dashboard/errands", label: "Errands", tag: "Workflow 1", Icon: ShoppingBag },
  { href: "/dashboard/standing", label: "Standing Errands", tag: "Workflow 2", Icon: CalendarClock },
  { href: "/dashboard/activity", label: "Activity", tag: "Audit trail", Icon: Receipt },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <Shell>{children}</Shell>
    </DashboardProvider>
  );
}

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

function Shell({ children }: { children: React.ReactNode }) {
  const { reduce, booting } = useDash();
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>{booting && <Splash reduce={!!reduce} />}</AnimatePresence>
      <div className="relative min-h-screen text-slate-100 selection:bg-[#3b7dff]/30">
        <Aurora />
        <MobileBar />
        <div className="mx-auto flex max-w-[1440px]">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 py-8 sm:px-8">{children}</main>
        </div>
      </div>
    </MotionConfig>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {NAV.map(({ href, label, tag, Icon, exact }) => {
        const active = isActive(pathname, href, exact);
        return (
          <Link key={href} href={href} onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff] ${active ? "bg-[#4d8bff]/12 text-white" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"}`}>
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${active ? "border-[#4d8bff]/40 bg-[#4d8bff]/15 text-[#8fb6ff]" : "border-white/[0.08] bg-white/[0.03] text-slate-400 group-hover:text-[#8fb6ff]"}`}>
              <Icon size={16} strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium leading-tight">{label}</span>
              <span className="block truncate text-[10px] uppercase tracking-wide text-slate-500">{tag}</span>
            </span>
            {active && <span aria-hidden className="ml-auto h-1.5 w-1.5 rounded-full bg-[#8fb6ff]" />}
          </Link>
        );
      })}
    </>
  );
}

function Sidebar() {
  const { mandate, remaining, pct, meterColor, liveAutonomy, mandateId } = useDash();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-white/[0.06] bg-[#070810]/70 px-4 py-6 backdrop-blur-xl md:flex">
      <Link href="/" className="flex items-center gap-2 rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b7dff]">
        <LogoMark className="h-7 w-7" />
        <span className="text-base font-semibold tracking-[-0.03em] text-white">gofer</span>
        <ArrowUpRight size={13} className="ml-auto text-slate-600" />
      </Link>

      <nav className="flex flex-col gap-1">
        <NavItems />
      </nav>

      {/* Live mandate mini-meter */}
      <div className="premium-card mt-auto rounded-xl bg-white/[0.03] p-4">
        <p className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-400">
          Mandate
          <AnimatePresence>
            {liveAutonomy && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 normal-case tracking-normal text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span aria-hidden className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                live
              </motion.span>
            )}
          </AnimatePresence>
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
          <motion.div className="h-full origin-left rounded-full" style={{ backgroundColor: meterColor }} initial={false} animate={{ scaleX: pct }} transition={SPRING.smooth} />
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          <span className="font-mono tabular-nums text-slate-200">{dollars(mandate.spentCents)}</span> spent ·{" "}
          <span className="font-mono tabular-nums text-slate-200">{dollars(remaining)}</span> left
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${mandateId ? "bg-emerald-400" : "bg-slate-600"}`} />
          {mandateId ? "enforced server-side" : "connecting…"}
        </p>
      </div>
    </aside>
  );
}

function MobileBar() {
  return (
    <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#070810]/85 backdrop-blur-xl md:hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark className="h-6 w-6" />
          <span className="text-sm font-semibold tracking-[-0.03em] text-white">gofer</span>
        </Link>
      </div>
      <div className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <NavItems />
      </div>
    </nav>
  );
}
