"use client";

// Activity (audit trail) — every move the agent makes, written down and sortable.

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { SPRING, SectionHead } from "../../kit";
import { useDash } from "../DashboardProvider";

const LedgerGrid = dynamic(() => import("../../LedgerGrid"), { ssr: false });

export default function ActivityPage() {
  const { ledger } = useDash();
  return (
    <div className="mx-auto max-w-5xl">
      <SectionHead id="activity" eyebrow="Audit trail"
        title="Activity ledger"
        desc="Every move the agent makes — searches, recommendations, approvals, denials, abstains, hands-free captures, and durability markers — written down and sortable." />
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={SPRING.smooth}
        className="premium-card mt-6 rounded-2xl bg-white/[0.03] p-5 backdrop-blur">
        <LedgerGrid rows={ledger} />
      </motion.div>
    </div>
  );
}
