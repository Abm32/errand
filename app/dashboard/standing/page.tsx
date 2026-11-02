"use client";

// Standing Errands (Workflow 2) — recurring, mandate-bound jobs that fire
// autonomously and settle hands-free. Click a run to fire it now.

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SPRING, SectionHead } from "../../kit";
import { useDash } from "../DashboardProvider";

const StandingGantt = dynamic(() => import("../../StandingGantt"), { ssr: false });

export default function StandingPage() {
  const { preset, busy, mandateId } = useDash();
  const router = useRouter();
  return (
    <div className="mx-auto max-w-5xl">
      <SectionHead id="autonomous" eyebrow="Workflow 2 · autonomous"
        title="Standing errands that run themselves"
        desc="Recurring, mandate-bound jobs fire autonomously on a schedule and settle hands-free — the same agent → Mandate → PayPal path, no human tap. Click any run to fire it now." />
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={SPRING.smooth}
        className="premium-card mt-6 rounded-2xl bg-white/[0.03] p-5 backdrop-blur">
        <div className="mb-3 flex items-center justify-end">
          <span className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-400" /> ran</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#4d8bff]" /> scheduled</span>
          </span>
        </div>
        <StandingGantt onRun={(g) => { preset(g); router.push("/dashboard/errands"); }} disabled={busy || !mandateId} />
      </motion.section>
    </div>
  );
}
