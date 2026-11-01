import { NextResponse } from "next/server";
import { connection } from "next/server";
import { all } from "@/lib/ledger";
import { getMandate, DEMO_MANDATE_ID } from "@/lib/store";

// Polled by the UI so autonomous (scheduler) activity and the live spend show up
// without a user action. Server is the source of truth for both the ledger and
// the running spend. connection() opts this handler into dynamic rendering
// (cacheComponents is on, which forbids `export const dynamic`).
export async function GET() {
  await connection();
  return NextResponse.json({ entries: all(), mandate: getMandate(DEMO_MANDATE_ID) ?? null });
}
