/** Developer API plan limits — keep in sync with backend app/developer_plans.py */
export const FREE_MONTHLY_CALLS = 100;

export const PLAN_LIMITS: Record<string, number> = {
  free: FREE_MONTHLY_CALLS,
  starter: 1_000,
  pro: 10_000,
  enterprise: 999_999,
};

export const PLAN_RANK: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  enterprise: 3,
};

export const MAX_ACTIVE_KEYS = 3;

/** Per-call rates (GBP) after free included calls when metered billing is enabled. */
export const METERED_RATES_GBP: Record<string, number> = {
  extract: 0.1,
  market_value: 0.15,
  classify: 0.05,
  value: 0.08,
};

/** Must match Stripe Price IDs on Cloud Run (STRIPE_PRICE_API_STARTER / PRO). */
export const API_PLANS = [
  { id: "free", name: "Free", calls: FREE_MONTHLY_CALLS, price: "£0", pricePence: 0 },
  { id: "starter", name: "Starter", calls: 1_000, price: "£99/mo", pricePence: 9_900 },
  { id: "pro", name: "Pro", calls: 10_000, price: "£299/mo", pricePence: 29_900 },
] as const;

/** Effective per-call price if customer uses full monthly allowance (subscription only). */
export function effectivePerCallGbp(planId: string): number | null {
  const plan = API_PLANS.find((p) => p.id === planId);
  if (!plan || !plan.pricePence || !plan.calls) return null;
  return plan.pricePence / 100 / plan.calls;
}

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "https://auralink-api-299567386855.us-central1.run.app";

export function highestPlan(plans: string[]): string {
  let best = "free";
  for (const p of plans) {
    const key = (p || "free").toLowerCase();
    if ((PLAN_RANK[key] ?? -1) > (PLAN_RANK[best] ?? -1)) best = key;
  }
  return best;
}

export function nextMonthResetLabel(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}
