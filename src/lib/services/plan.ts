import type { Db } from "@/lib/db/types";
import { getEnv } from "@/lib/env";
import { effectivePlan, type Plan } from "@/lib/plan";
import { getSubscription, type SubscriptionRecord } from "@/lib/repo/subscriptions";

/**
 * Effective plan of a user. With WITCAR_OPEN_ACCESS (default) everybody gets
 * the full feature set and the Stripe state is ignored (D-034); with
 * WITCAR_OPEN_ACCESS=0 the Free/Pro limits from the mirrored subscription apply.
 */
export async function getUserPlan(
  db: Db,
  userId: string,
  now = Date.now(),
): Promise<{ plan: Plan; subscription: SubscriptionRecord | null }> {
  const subscription = await getSubscription(db, userId);
  const plan = getEnv().WITCAR_OPEN_ACCESS ? "pro" : effectivePlan(subscription, now);
  return { plan, subscription };
}
