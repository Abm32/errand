// Relevance/abstain guard for the agent's pick. The money-safety property under
// test: when nothing in the catalog matches the goal, the agent buys NOTHING
// (abstains) rather than defaulting to the cheapest off-goal item.
import assert from "node:assert";
import { cheapestRelevant } from "./agent";
import type { Product } from "./adapters/channel3";

const p = (id: string, title: string, priceCents: number, category = "x", merchant = "m"): Product =>
  ({ id, title, priceCents, category, merchant, url: "" } as Product);

// Off-goal catalog → abstain (the exact bug: "coffee beans" must NOT buy an air filter).
const coffeeCatalog = [p("1", "Filtrete Dust & Lint Air Filter", 647), p("2", "Dark Roast 20oz Camper Mug", 1299)];
assert.strictEqual(cheapestRelevant("Restock the good coffee beans, under $20", coffeeCatalog), undefined, "off-goal catalog must abstain, not buy cheapest");

// On-goal present → cheapest on-goal item wins (not the cheapest overall).
const mixed = [p("1", "Air Filter", 300), p("2", "Whole Bean Coffee, Dark Roast", 1500), p("3", "Coffee Beans Sampler", 900)];
assert.strictEqual(cheapestRelevant("coffee beans", mixed)?.id, "3", "must pick cheapest title-matching item");

// Empty catalog → abstain.
assert.strictEqual(cheapestRelevant("coffee", []), undefined, "empty catalog abstains");

console.log("agent.ts OK — abstains off-goal, picks cheapest on-goal");
