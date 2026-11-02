"use client";

// Standing errands on a Bryntum Gantt — recurring, mandate-bound jobs laid out
// on a real project timeline. Each parent row is a standing errand; its child
// bars are runs (100% = already ran, 0% = upcoming). Click any task to send that
// errand to the live agent now — same Mandate, same PayPal settlement.
//
// Bryntum reads the DOM at construction, so this is client-only (imported via
// next/dynamic with ssr:false from page.tsx). CSS import order is required:
// fontawesome -> solid -> structural gantt.css -> dark theme.
import { useMemo } from "react";
import { BryntumGantt } from "@bryntum/gantt-react";
import "@bryntum/gantt/fontawesome/css/fontawesome.css";
import "@bryntum/gantt/fontawesome/css/solid.css";
import "@bryntum/gantt/gantt.css";
import "@bryntum/gantt/stockholm-dark.css";
import { ganttTasks } from "@/lib/standing";

export default function StandingGantt({
  onRun,
  disabled,
}: {
  onRun: (goal: string) => void;
  disabled?: boolean;
}) {
  const { tasks, projectStart } = useMemo(() => ganttTasks(), []);

  const columns = useMemo(
    () => [{ type: "name" as const, text: "Standing errand", field: "name", width: 260 }],
    []
  );

  return (
    <div style={{ height: 600 }} className="overflow-hidden rounded-xl border border-white/[0.07]">
      <BryntumGantt
        tasks={tasks}
        columns={columns}
        startDate={projectStart}
        viewPreset="weekAndDayLetter"
        rowHeight={54}
        barMargin={12}
        readOnly
        // A task is a real trigger: hand its goal to the agent, let the Mandate decide.
        onTaskClick={({ taskRecord }: { taskRecord: { getData: (f: string) => string } }) => {
          if (!disabled) onRun(taskRecord.getData("goal"));
        }}
      />
    </div>
  );
}
