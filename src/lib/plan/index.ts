/**
 * Plan limits (masterplan §15.1). Prices live in Stripe/env, never here.
 * Limits are enforced server-side in the layout/device services.
 */
export type Plan = "free" | "pro";

export interface PlanLimits {
  widgetsPerLayout: number;
  standardLayouts: number;
  tickersPerWidget: number;
  devices: number;
  proWidgets: boolean;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: { widgetsPerLayout: 3, standardLayouts: 1, tickersPerWidget: 3, devices: 1, proWidgets: false },
  pro: { widgetsPerLayout: 24, standardLayouts: 10, tickersPerWidget: 20, devices: 5, proWidgets: true },
};

export const PAST_DUE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export interface SubscriptionState {
  plan: Plan;
  status: string;
  pastDueSince: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

/**
 * Effective plan from the mirrored Stripe state. past_due keeps Pro for a
 * 7-day grace period, then falls back to Free (no data is deleted).
 */
export function effectivePlan(sub: SubscriptionState | null, now: number = Date.now()): Plan {
  if (!sub || sub.plan !== "pro") return "free";
  if (sub.status === "active" || sub.status === "trialing") return "pro";
  if (sub.status === "past_due") {
    const since = sub.pastDueSince ? Date.parse(sub.pastDueSince) : now;
    return now - since < PAST_DUE_GRACE_MS ? "pro" : "free";
  }
  return "free";
}
