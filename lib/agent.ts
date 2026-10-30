// The Errand agent: turn a plain-English goal into a safe, mandate-bound
// purchase decision.
//
// Primary path (when an AI key is set): a real AI SDK tool-calling loop — the
// model searches the Channel3 catalog itself, then recommends one product.
// Fallback path (no key): a deterministic planner so the whole flow still runs
// for local demos and CI. Either way the decision goes through the Mandate
// engine before any money moves.

import { generateText, generateObject, tool, stepCountIs } from "ai";
import { z } from "zod";
import { searchProducts, type Product } from "./adapters/channel3";
import { screen, type Mandate, type Decision } from "./mandate";

export type AgentResult = {
  reply: string;
  considered: Product[];
  pick?: Product;
  decision?: Decision;
};

function model() {
  // Prefer an explicit model id; route through the Vercel AI Gateway by default.
  const id = process.env.AI_MODEL ?? "anthropic/claude-sonnet-4.5";
  const hasKey =
    process.env.ANTHROPIC_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY;
  return hasKey ? id : null;
}

/** Parse a rough max price (in cents) out of a free-text goal, e.g. "under $50". */
function parseMaxCents(goal: string): number | undefined {
  const m = goal.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  return m ? Math.round(parseFloat(m[1]) * 100) : undefined;
}

export async function runAgent(goal: string, mandate: Mandate): Promise<AgentResult> {
  const budgetCap = Math.min(
    mandate.perItemCapCents,
    mandate.budgetCents - mandate.spentCents,
  );
  const maxCents = Math.min(parseMaxCents(goal) ?? budgetCap, budgetCap);
  const id = model();

  // ---- Fallback planner (no AI key) ----
  if (!id) {
    const found = await searchProducts(goal, maxCents);
    const pick = found.sort((a, b) => a.priceCents - b.priceCents).at(-1); // best within budget
    if (!pick) {
      return { reply: "I couldn't find anything within your mandate's budget.", considered: found };
    }
    const decision = screen(mandate, {
      title: pick.title,
      amountCents: pick.priceCents,
      category: pick.category,
      merchant: pick.merchant,
    });
    return {
      reply: `I found "${pick.title}" for $${(pick.priceCents / 100).toFixed(2)} from ${pick.merchant}. ${decision.reason}`,
      considered: found,
      pick,
      decision,
    };
  }

  // ---- AI tool-calling path ----
  let considered: Product[] = [];
  const search = tool({
    description: "Search the product catalog. Returns products with id, title, priceCents, category, merchant.",
    inputSchema: z.object({
      query: z.string().describe("search keywords"),
      maxPriceCents: z.number().optional().describe("hard price ceiling in cents"),
    }),
    execute: async ({ query, maxPriceCents }) => {
      const r = await searchProducts(query, maxPriceCents ?? maxCents);
      considered = r;
      return r;
    },
  });

  const system =
    `You are Errand, an autonomous shopping agent. You spend the user's money ONLY within their mandate. ` +
    `Mandate: budget $${(mandate.budgetCents / 100).toFixed(2)}, per-item cap $${(mandate.perItemCapCents / 100).toFixed(2)}, ` +
    `auto-approve under $${(mandate.autoApproveUnderCents / 100).toFixed(2)}` +
    (mandate.allowedCategories?.length ? `, allowed categories: ${mandate.allowedCategories.join(", ")}` : "") +
    `. Search the catalog, then recommend the single best product within budget. Never exceed the per-item cap.`;

  await generateText({
    model: id,
    system,
    prompt: `Goal: ${goal}`,
    tools: { search },
    stopWhen: stepCountIs(5),
  });

  if (considered.length === 0) considered = await searchProducts(goal, maxCents);
  if (considered.length === 0) {
    return { reply: "I couldn't find anything within your mandate's budget.", considered };
  }

  // Constrain the final pick to products actually found.
  const { object } = await generateObject({
    model: id,
    schema: z.object({
      productId: z.string(),
      reply: z.string().describe("one friendly sentence explaining the choice"),
    }),
    prompt:
      `Pick the best product for the goal "${goal}" from this list and explain in one sentence.\n` +
      JSON.stringify(considered.map((p) => ({ id: p.id, title: p.title, priceCents: p.priceCents, merchant: p.merchant, category: p.category }))),
  });

  const pick = considered.find((p) => p.id === object.productId) ?? considered[0];
  const decision = screen(mandate, {
    title: pick.title,
    amountCents: pick.priceCents,
    category: pick.category,
    merchant: pick.merchant,
  });
  return { reply: object.reply, considered, pick, decision };
}
