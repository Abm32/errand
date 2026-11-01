// Run: npx tsx lib/standing.test.ts
import { ganttTasks, ERRANDS } from "./standing";
import assert from "node:assert";

const now = Date.UTC(2026, 9, 31, 12, 0, 0); // fixed clock -> deterministic
const { tasks } = ganttTasks(now);

assert.equal(tasks.length, ERRANDS.length, "one parent task per errand");

for (const t of tasks) {
  const kids = t.children ?? [];
  assert.ok(kids.length > 0, `${t.id} has runs`);
  // Past runs are 100% done, future runs 0% — split must straddle `now`.
  const done = kids.filter((k) => k.percentDone === 100);
  const planned = kids.filter((k) => k.percentDone === 0);
  assert.equal(done.length + planned.length, kids.length, "every run is done or planned");
  assert.ok(done.length > 0 && planned.length > 0, `${t.id} has both past and upcoming runs`);
  // Every run carries the errand goal for the click-to-run tie-in.
  assert.ok(kids.every((k) => k.goal === t.goal && k.goal.length > 0), "runs carry goal");
  // Done ⇔ before now.
  for (const k of kids) {
    const before = new Date(k.startDate!).getTime() < now;
    assert.equal(k.percentDone === 100, before, `${k.id} done matches start<now`);
  }
}

console.log("standing.ts OK —", tasks.map((t) => `${t.id}:${t.children?.length}`).join(" "));
