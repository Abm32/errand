// Self-check for the server-authoritative store (the money-truth path).
// Run: npx tsx lib/store.test.ts
import assert from "node:assert";
import { createMandate, updateMandate, getMandate, addSpent, savePending, getPending, dropPending } from "./store";
import type { Product } from "./adapters/channel3";

const { mandateId, mandate } = createMandate({
  label: "t",
  budgetCents: 5000,
  perItemCapCents: 4000,
  autoApproveUnderCents: 2000,
  allowedCategories: ["gardening"],
});
assert.equal(mandate.spentCents, 0, "new mandate starts at 0 spent");

// A client cannot inject spentCents through an update — it must be ignored.
const tampered = updateMandate(mandateId, { budgetCents: 9000, spentCents: 99999 } as never);
assert.equal(tampered?.spentCents, 0, "update must not accept client spentCents");
assert.equal(tampered?.budgetCents, 9000, "update applies real config");

// Spend only moves via addSpent (called server-side after a real capture).
addSpent(mandateId, 1500);
addSpent(mandateId, 1000);
assert.equal(getMandate(mandateId)?.spentCents, 2500, "spend accumulates server-side");

// Another update still can't reset/forge the spent total.
updateMandate(mandateId, { perItemCapCents: 1 });
assert.equal(getMandate(mandateId)?.spentCents, 2500, "spent survives config updates");

// Pending proposals round-trip and carry the server's product/price (so the
// client can't approve a tampered cheaper price).
const product: Product = { id: "m3", title: "Trowel", priceCents: 3400, category: "gardening", merchant: "GreenThumb", url: "#" };
const pid = savePending(mandateId, product);
assert.equal(getPending(pid)?.product.priceCents, 3400, "proposal keeps server price");
assert.equal(getPending(pid)?.mandateId, mandateId, "proposal bound to its mandate");
dropPending(pid);
assert.equal(getPending(pid), undefined, "dropped proposal is gone");

// Unknown ids are safe.
assert.equal(getMandate("nope"), undefined);
assert.equal(updateMandate("nope", { budgetCents: 1 }), undefined);

// Persistence: state was written to STORE_FILE and reloads with the real spend.
import fs from "node:fs";
const f = process.env.STORE_FILE;
assert.ok(f && fs.existsSync(f), "store file should exist after writes");
const snap = JSON.parse(fs.readFileSync(f!, "utf8"));
const saved = new Map<string, { spentCents: number }>(snap.mandates);
assert.equal(saved.get(mandateId)?.spentCents, 2500, "persisted file carries the real spend");

console.log("✓ store: mandate/spend/proposal integrity + persistence checks passed");
