// Standing errands — recurring, mandate-bound jobs the agent runs on a cadence
// ("restock the coffee every week, under $20"). This is the natural next shape
// of agentic commerce: not one-shot buys, but a leash you set once that keeps
// spending safely over time. A Bryntum Gantt renders each errand as a parent
// task whose children are its runs — past runs show 100% done, upcoming ones 0%.
//
// The Gantt view projects the cadence deterministically for display, but the
// runs are REAL: lib/scheduler.ts (started from instrumentation.ts) autonomously
// fires each standing errand on a cadence through the live agent + Mandate +
// PayPal path — and clicking a run fires it on demand too.
// ponytail: in-process setInterval scheduler on one instance; move to a durable
// queue / Render Cron for multi-instance or at-least-once guarantees.

export type StandingErrand = {
  id: string;
  name: string;
  goal: string; // the errand prompt handed to the agent
  category: string;
  capCents: number; // per-run spend ceiling
  cadenceDays: number;
  phaseDays: number; // offset so errands don't all run on the same day
};

// A Bryntum Gantt task (subset we use). `goal` is a custom field we read back on
// click to drive the real agent; `children` makes the errand a parent row.
export type GanttTask = {
  id: string;
  name: string;
  startDate?: string; // ISO; omit on parents (rolled up from children)
  duration?: number;
  durationUnit?: "day";
  percentDone?: number;
  expanded?: boolean;
  // Honor our explicit startDate instead of letting the Gantt engine auto-schedule
  // every run to the project start (which piles all bars at the window's left edge).
  manuallyScheduled?: boolean;
  goal: string;
  children?: GanttTask[];
};

const DAY = 86_400_000;
const HOUR = 3_600_000;

export const ERRANDS: StandingErrand[] = [
  { id: "se_coffee", name: "Restock coffee beans · weekly · ≤$20", goal: "Restock the good coffee beans, under $20", category: "kitchen", capCents: 2000, cadenceDays: 7, phaseDays: 1 },
  { id: "se_seeds", name: "Garden seed refill · 5-daily · ≤$15", goal: "Refill the garden seed subscription, under $15", category: "gardening", capCents: 1500, cadenceDays: 5, phaseDays: 0 },
  { id: "se_catfood", name: "Cat food top-up · 10-daily · ≤$35", goal: "Order more cat food, under $35", category: "pets", capCents: 3500, cadenceDays: 10, phaseDays: 3 },
];

const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * Build the Gantt task tree across a window around `now`: [now - 7d, now + 12d].
 * Each errand is a parent; its runs are children. Runs before `now` are done
 * (100%), after are planned (0%). Deterministic given `now`.
 */
export function ganttTasks(now: number = Date.now()): { tasks: GanttTask[]; projectStart: Date } {
  const day0 = startOfDay(now);
  const start = day0 - 7 * DAY;
  const end = day0 + 12 * DAY;

  const tasks: GanttTask[] = ERRANDS.map((e) => {
    const children: GanttTask[] = [];
    let t = day0 + e.phaseDays * DAY + 9 * HOUR;
    while (t > start) t -= e.cadenceDays * DAY;
    while (t < start) t += e.cadenceDays * DAY;
    for (; t <= end; t += e.cadenceDays * DAY) {
      const done = t < now;
      children.push({
        id: `${e.id}_${t}`,
        name: done ? "ran" : "scheduled",
        startDate: new Date(t).toISOString(),
        duration: 1,
        durationUnit: "day",
        percentDone: done ? 100 : 0,
        manuallyScheduled: true,
        goal: e.goal,
      });
    }
    return { id: e.id, name: e.name, expanded: true, goal: e.goal, children };
  });

  return { tasks, projectStart: new Date(start) };
}
