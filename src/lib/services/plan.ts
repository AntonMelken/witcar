import type { Db } from "@/lib/db/types";
import { effectivePlan, type Plan } from "@/lib/plan";
import { getSubscription, type SubscriptionRecord } from "@/lib/repo/subscriptions";

export async function getUserPlan(
  db: Db,
  userId: string,
  now = Date.now(),
): Promise<{ plan: Plan; subscription: SubscriptionRecord | null }> {
  const subscription = await getSubscription(db, userId);
  return { plan: effectivePlan(subscription, now), subscription };
}
