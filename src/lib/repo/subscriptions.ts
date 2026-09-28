import { toIso, type Db } from "@/lib/db/types";
import type { Plan, SubscriptionState } from "@/lib/plan";

export interface SubscriptionRecord extends SubscriptionState {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  priceId: string | null;
  lastEventCreated: number | null;
}

interface Row {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: Plan;
  status: string;
  price_id: string | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
  past_due_since: Date | null;
  last_event_created: string | number | null;
}

const map = (r: Row): SubscriptionRecord => ({
  userId: r.user_id,
  stripeCustomerId: r.stripe_customer_id,
  stripeSubscriptionId: r.stripe_subscription_id,
  plan: r.plan,
  status: r.status,
  priceId: r.price_id,
  currentPeriodEnd: toIso(r.current_period_end),
  cancelAtPeriodEnd: r.cancel_at_period_end,
  pastDueSince: toIso(r.past_due_since),
  lastEventCreated: r.last_event_created == null ? null : Number(r.last_event_created),
});

export async function getSubscription(db: Db, userId: string): Promise<SubscriptionRecord | null> {
  const rows = await db.query<Row>("select * from public.subscriptions where user_id = $1", [userId]);
  return rows[0] ? map(rows[0]) : null;
}

export async function findUserIdByCustomer(db: Db, customerId: string): Promise<string | null> {
  const rows = await db.query<{ user_id: string }>(
    "select user_id from public.subscriptions where stripe_customer_id = $1",
    [customerId],
  );
  return rows[0]?.user_id ?? null;
}

export async function userExists(db: Db, userId: string): Promise<boolean> {
  const rows = await db.query("select 1 from auth.users where id = $1", [userId]);
  return rows.length > 0;
}

export interface SubscriptionPatch {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  plan?: Plan;
  status?: string;
  priceId?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  pastDueSince?: string | null;
  lastEventCreated?: number;
}

const COLUMNS: Record<keyof SubscriptionPatch, string> = {
  stripeCustomerId: "stripe_customer_id",
  stripeSubscriptionId: "stripe_subscription_id",
  plan: "plan",
  status: "status",
  priceId: "price_id",
  currentPeriodEnd: "current_period_end",
  cancelAtPeriodEnd: "cancel_at_period_end",
  pastDueSince: "past_due_since",
  lastEventCreated: "last_event_created",
};

/** Upserts the Stripe mirror row. Only the webhook/service code calls this. */
export async function upsertSubscription(db: Db, userId: string, patch: SubscriptionPatch): Promise<void> {
  await db.query("insert into public.subscriptions (user_id) values ($1) on conflict do nothing", [userId]);
  const sets: string[] = [];
  const params: unknown[] = [userId];
  for (const [key, col] of Object.entries(COLUMNS) as [keyof SubscriptionPatch, string][]) {
    if (patch[key] === undefined) continue;
    params.push(patch[key]);
    sets.push(`${col} = $${params.length}`);
  }
  if (sets.length === 0) return;
  await db.query(`update public.subscriptions set ${sets.join(", ")} where user_id = $1`, params);
}

/** Records a processed Stripe event. Returns false if it was already processed. */
export async function markStripeEventProcessed(db: Db, id: string, type: string): Promise<boolean> {
  const rows = await db.query<{ id: string }>(
    "insert into public.stripe_events (id, type) values ($1, $2) on conflict (id) do nothing returning id",
    [id, type],
  );
  return rows.length > 0;
}
