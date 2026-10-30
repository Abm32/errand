// Transparent activity ledger — every move the agent makes is recorded here so
// the user can audit exactly what their money-spending agent did and why.
// In-memory for the demo.
// ponytail: in-memory, swap for a DB (Prisma/Postgres) when multi-session or
// persistence across restarts is needed.

export type LedgerEntry = {
  id: string;
  at: number;
  kind: "search" | "recommend" | "auto_approved" | "awaiting_approval" | "denied" | "purchased";
  summary: string;
  detail?: string;
  amountCents?: number;
  orderId?: string;
  approveUrl?: string;
};

const store: LedgerEntry[] = [];

export function record(e: Omit<LedgerEntry, "id" | "at">): LedgerEntry {
  const entry: LedgerEntry = { id: `l_${store.length + 1}_${Date.now()}`, at: Date.now(), ...e };
  store.push(entry);
  return entry;
}

export const all = () => [...store];
