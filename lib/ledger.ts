// Transparent activity ledger — every move the agent makes is recorded here so
// the user can audit exactly what their money-spending agent did and why.
//
// Persistence: a JSON file (stdlib fs, no deps). Survives restarts on a writable
// disk; no-ops quietly on read-only hosts.
// ponytail: single-file append-and-rewrite; swap for a DB alongside the store
// when scaling past one instance.

import fs from "node:fs";
import path from "node:path";

export type LedgerEntry = {
  id: string;
  at: number;
  kind: "search" | "recommend" | "awaiting_approval" | "denied" | "ordered" | "purchased";
  summary: string;
  detail?: string;
  amountCents?: number;
  orderId?: string;
  captureId?: string;
  approveUrl?: string;
  proposalId?: string;
};

let store: LedgerEntry[] = [];

const file = () => process.env.LEDGER_FILE ?? path.join(process.cwd(), ".data", "ledger.json");

let loaded = false;
function load() {
  if (loaded) return;
  loaded = true;
  try {
    store = JSON.parse(fs.readFileSync(file(), "utf8"));
  } catch {
    /* none yet */
  }
}

function persist() {
  try {
    const f = file();
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(store));
  } catch (e) {
    console.warn("ledger persist skipped:", (e as Error).message);
  }
}

export function record(e: Omit<LedgerEntry, "id" | "at">): LedgerEntry {
  load();
  const entry: LedgerEntry = { id: `l_${store.length + 1}_${Date.now()}`, at: Date.now(), ...e };
  store.push(entry);
  persist();
  return entry;
}

export function all() {
  load();
  return [...store];
}
