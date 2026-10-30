// The Gofer agent: turn a plain-English goal into a safe, mandate-bound
// purchase recommendation.
//
// Primary path (AI key set): one AI SDK tool-calling loop. The model searches
// the catalog itself and then calls a `recommend` tool with its final pick —
// the agent genuinely drives the decision (no separate post-hoc re-pick).
// Fallback path (no key / AI error): a deterministic planner so the whole flow
// still runs for local demos and CI. Either way the pick goes through the
// Mandate engine before any money moves.

import { generateText, tool, stepCountIs, type LanguageModel } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { searchProducts, type Product } from "./adapters/channel3";
import { screen, type Mandate, type Decision } from "./mandate";

export type AgentResult = {
  reply: string;
  considered: Product[];
  pick?: Product;
  decision?: Decision;
};

function model(): LanguageModel | null {
  // Preferred: Meta's model API (OpenAI-compatible), driven by the user's Meta key.
  // Default to Meta Muse (muse-spark-1.3) at api.meta.ai; override via env.
  const metaKey = process.env.META_API_KEY ?? process.env.MODEL_API_KEY ?? process.env.LLAMA_API_KEY;
  if (metaKey) {
    const meta = createOpenAICompatible({
      name: "meta",
      baseURL: process.env.META_BASE_URL ?? process.env.MODEL_API_BASE_URL ?? "https://api.meta.ai/v1",
      apiKey: metaKey,
    });
    return meta(process.env.META_MODEL ?? process.env.MUSE_MODEL ?? "muse-spark-1.3");
  }
  // Otherwise route a plain model id through the Vercel AI Gateway.
  const hasKey =
    process.env.ANTHROPIC_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY;
  return hasKey ? (process.env.AI_MODEL ?? "anthropic/claude-sonnet-4.5") : null;
}

/** Parse a rough max price (in cents) out of a free-text goal, e.g. "under $50". */
function parseMaxCents(goal: string): number | undefined {
  const m = goal.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  return m ? Math.round(parseFloat(m[1]) * 100) : undefined;
}

function decide(mandate: Mandate, p: Product): Decision {
  return screen(mandate, { title: p.title, amountCents: p.priceCents, category: p.category, merchant: p.merchant });
}

// Deterministic planner used when no AI key is set, or the AI path errors.
// Policy: it's a gift/shopping agent, so spend the budget well — pick the
// nicest qualifying item within the price ceiling (highest-priced that fits),
// then let the Mandate engine gate it.
async function fallback(goal: string, mandate: Mandate, maxCents: number): Promise<AgentResult> {
  const found = await searchProducts(goal, maxCents);
  const pick = [...found].sort((a, b) => b.priceCents - a.priceCents)[0];
  if (!pick) {
    return { reply: "I couldn't find anything within your mandate's budget.", considered: found };
  }
  const decision = decide(mandate, pick);
  return {
    reply: `I found "${pick.title}" for $${(pick.priceCents / 100).toFixed(2)} from ${pick.merchant}. ${decision.reason}`,
    considered: found,
    pick,
    decision,
  };
}

export async function runAgent(goal: string, mandate: Mandate): Promise<AgentResult> {
  const budgetCap = Math.min(mandate.perItemCapCents, mandate.budgetCents - mandate.spentCents);
  const maxCents = Math.min(parseMaxCents(goal) ?? budgetCap, budgetCap);
  const m = model();

  if (!m) return fallback(goal, mandate, maxCents);
  try {
    return await aiRun(goal, mandate, maxCents, m);
  } catch (err) {
    console.warn("AI path failed, using deterministic planner:", (err as Error).message);
    return fallback(goal, mandate, maxCents);
  }
}

async function aiRun(goal: string, mandate: Mandate, maxCents: number, m: LanguageModel): Promise<AgentResult> {
  let considered: Product[] = [];
  let recommendation: { product: Product; reason: string } | null = null;

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

  const recommend = tool({
    description: "Recommend exactly one product (by id, from a prior search) as the final choice. Call this once when decided.",
    inputSchema: z.object({
      productId: z.string(),
      reason: z.string().describe("one friendly sentence explaining the choice"),
    }),
    execute: async ({ productId, reason }) => {
      const product = considered.find((p) => p.id === productId);
      if (!product) return { ok: false, error: "Unknown productId — search first and use a returned id." };
      recommendation = { product, reason };
      return { ok: true };
    },
  });

  const system =
    `You are Gofer, an autonomous shopping agent. You spend the user's money ONLY within their mandate. ` +
    `Mandate: budget $${(mandate.budgetCents / 100).toFixed(2)}, per-item cap $${(mandate.perItemCapCents / 100).toFixed(2)}, ` +
    `auto-approve under $${(mandate.autoApproveUnderCents / 100).toFixed(2)}` +
    (mandate.allowedCategories?.length ? `, allowed categories: ${mandate.allowedCategories.join(", ")}` : "") +
    `. Search the catalog, then call recommend() exactly once with the single best product within budget. Never exceed the per-item cap.`;

  await generateText({
    model: m,
    system,
    prompt: `Goal: ${goal}`,
    tools: { search, recommend },
    stopWhen: stepCountIs(6),
  });

  // If the model didn't commit to a pick, fall back to the deterministic choice.
  if (!recommendation) {
    if (considered.length === 0) considered = await searchProducts(goal, maxCents);
    const pick = [...considered].sort((a, b) => b.priceCents - a.priceCents)[0];
    if (!pick) return { reply: "I couldn't find anything within your mandate's budget.", considered };
    const decision = decide(mandate, pick);
    return { reply: `I found "${pick.title}" for $${(pick.priceCents / 100).toFixed(2)}. ${decision.reason}`, considered, pick, decision };
  }

  const { product, reason } = recommendation;
  return { reply: reason, considered, pick: product, decision: decide(mandate, product) };
}
