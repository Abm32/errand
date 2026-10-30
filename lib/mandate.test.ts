// Runnable self-check for the Mandate engine (the money-safety path).
// Run: npx tsx lib/mandate.test.ts   (no test framework needed)
import assert from "node:assert";
import { screen, remainingBudget, type Mandate } from "./mandate";

const base: Mandate = {
  label: "Gift",
  budgetCents: 5000, // $50
  perItemCapCents: 4000, // $40
  autoApproveUnderCents: 2000, // $20
  allowedCategories: ["gardening", "books"],
  blockedMerchants: ["ShadyStore"],
  spentCents: 0,
};

// auto-approve: cheap + allowed category
assert.equal(
  screen(base, { title: "Seed kit", amountCents: 1500, category: "gardening" }).verdict,
  "auto_approve",
);

// needs approval: within caps but above auto-approve threshold
assert.equal(
  screen(base, { title: "Planter", amountCents: 3000, category: "gardening" }).verdict,
  "needs_approval",
);

// deny: over per-item cap
assert.equal(
  screen(base, { title: "Shed", amountCents: 4500, category: "gardening" }).verdict,
  "deny",
);

// deny: category not allowed
assert.equal(
  screen(base, { title: "Vape", amountCents: 1000, category: "electronics" }).verdict,
  "deny",
);

// deny: blocked merchant
assert.equal(
  screen(base, { title: "Gloves", amountCents: 500, category: "gardening", merchant: "ShadyStore" }).verdict,
  "deny",
);

// deny: expired mandate
assert.equal(
  screen({ ...base, expiresAt: 1000 }, { title: "x", amountCents: 500, category: "books" }, 2000).verdict,
  "deny",
);

// deny: over remaining budget after prior spend
assert.equal(
  screen({ ...base, spentCents: 4800 }, { title: "Book", amountCents: 1500, category: "books" }).verdict,
  "deny",
);

// deny: garbage amount
assert.equal(
  screen(base, { title: "x", amountCents: 0, category: "books" }).verdict,
  "deny",
);

// remaining budget helper never goes negative
assert.equal(remainingBudget({ ...base, spentCents: 9999 }), 0);

console.log("✓ mandate engine: all checks passed");
