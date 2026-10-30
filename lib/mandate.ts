// The Mandate engine — Errand's trust layer.
// An AI agent may spend money ONLY within a mandate the user granted.
// Every proposed purchase is screened here before any PayPal call is made.
// This is deliberately a pure, dependency-free module so it is easy to test
// and impossible to bypass: the agent route calls screen() and obeys it.

export type Mandate = {
  /** Human label, e.g. "Mom's birthday gift". */
  label: string;
  /** Total the agent may spend across this whole mandate. */
  budgetCents: number;
  /** Largest single purchase the agent may ever make (hard ceiling). */
  perItemCapCents: number;
  /** At or below this, the agent may buy without asking. Above → human approval. */
  autoApproveUnderCents: number;
  /** If non-empty, the purchase category must be in this list. */
  allowedCategories?: string[];
  /** Merchants the agent must never buy from. */
  blockedMerchants?: string[];
  /** Epoch ms after which the mandate is dead. Omit for no expiry. */
  expiresAt?: number;
  /** Running total already spent under this mandate. */
  spentCents: number;
};

export type Purchase = {
  title: string;
  amountCents: number;
  category?: string;
  merchant?: string;
};

export type Decision =
  | { verdict: "auto_approve"; reason: string }
  | { verdict: "needs_approval"; reason: string }
  | { verdict: "deny"; reason: string };

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/**
 * Screen a proposed purchase against a mandate.
 * Order matters: hard denials first (expiry, category, merchant, per-item cap,
 * remaining budget), then the approval threshold.
 */
export function screen(m: Mandate, p: Purchase, now: number = Date.now()): Decision {
  if (!Number.isFinite(p.amountCents) || p.amountCents <= 0) {
    return { verdict: "deny", reason: "Purchase amount is invalid." };
  }
  if (m.expiresAt !== undefined && now > m.expiresAt) {
    return { verdict: "deny", reason: "This mandate has expired." };
  }
  if (p.merchant && m.blockedMerchants?.includes(p.merchant)) {
    return { verdict: "deny", reason: `Merchant "${p.merchant}" is blocked.` };
  }
  if (m.allowedCategories && m.allowedCategories.length > 0) {
    if (!p.category || !m.allowedCategories.includes(p.category)) {
      return {
        verdict: "deny",
        reason: `Category "${p.category ?? "unknown"}" is outside this mandate.`,
      };
    }
  }
  if (p.amountCents > m.perItemCapCents) {
    return {
      verdict: "deny",
      reason: `${money(p.amountCents)} exceeds the per-item cap of ${money(m.perItemCapCents)}.`,
    };
  }
  const remaining = m.budgetCents - m.spentCents;
  if (p.amountCents > remaining) {
    return {
      verdict: "deny",
      reason: `${money(p.amountCents)} exceeds the remaining budget of ${money(remaining)}.`,
    };
  }
  if (p.amountCents <= m.autoApproveUnderCents) {
    return {
      verdict: "auto_approve",
      reason: `${money(p.amountCents)} is within the auto-approve limit of ${money(m.autoApproveUnderCents)}.`,
    };
  }
  return {
    verdict: "needs_approval",
    reason: `${money(p.amountCents)} is above the auto-approve limit of ${money(m.autoApproveUnderCents)} — your approval is required.`,
  };
}

export const remainingBudget = (m: Mandate) =>
  Math.max(0, m.budgetCents - m.spentCents);
