import type Stripe from "stripe";
import type { Db } from "@/lib/db/types";
import {
  findUserIdByCustomer,
  getSubscription,
  markStripeEventProcessed,
  upsertSubscription,
  userExists,
} from "@/lib/repo/subscriptions";

export interface WebhookConfig {
  /** empty set = every subscription counts as Pro (single-product setup) */
  proPriceIds: Set<string>;
  now?: () => number;
}

export type WebhookOutcome = "processed" | "duplicate" | "ignored" | "unmatched";

const idOf = (v: string | { id: string } | null | undefined): string | null =>
  typeof v === "string" ? v : (v?.id ?? null);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveUser(db: Db, candidate: string | null | undefined, customerId: string | null) {
  if (candidate && UUID.test(candidate) && (await userExists(db, candidate))) return candidate;
  return customerId ? findUserIdByCustomer(db, customerId) : null;
}

function periodEnd(sub: Stripe.Subscription): string | null {
  // Since API 2025-03-31 the billing period lives on subscription items.
  const item = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  const ts = item?.current_period_end ?? legacy;
  return typeof ts === "number" ? new Date(ts * 1000).toISOString() : null;
}

/**
 * Applies one Stripe event to the subscriptions mirror. Idempotent: the event
 * id is recorded in the same transaction, so a replay changes nothing and a
 * failure rolls back so Stripe retries. Older events never overwrite newer state.
 */
export async function processStripeEvent(db: Db, event: Stripe.Event, cfg: WebhookConfig): Promise<WebhookOutcome> {
  const now = cfg.now ?? Date.now;
  return db.tx(async (tx) => {
    if (!(await markStripeEventProcessed(tx, event.id, event.type))) return "duplicate";

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode !== "subscription") return "ignored";
        const customerId = idOf(s.customer);
        const userId = await resolveUser(tx, s.client_reference_id ?? s.metadata?.userId, customerId);
        if (!userId) return "unmatched";
        const existing = await getSubscription(tx, userId);
        const newer = existing?.lastEventCreated != null && existing.lastEventCreated > event.created;
        await upsertSubscription(tx, userId, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: idOf(s.subscription),
          ...(!newer && s.payment_status === "paid"
            ? { plan: "pro" as const, status: "active", pastDueSince: null }
            : {}),
        });
        return "processed";
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = idOf(sub.customer);
        const userId = await resolveUser(tx, sub.metadata?.userId, customerId);
        if (!userId) return "unmatched";
        const existing = await getSubscription(tx, userId);
        if (existing?.lastEventCreated != null && existing.lastEventCreated > event.created) return "ignored";

        const deleted = event.type === "customer.subscription.deleted";
        const priceId = sub.items?.data?.[0]?.price?.id ?? null;
        const priceIsPro =
          cfg.proPriceIds.size === 0 || (sub.items?.data ?? []).some((i) => cfg.proPriceIds.has(i.price.id));
        const terminal = deleted || sub.status === "canceled" || sub.status === "incomplete_expired";
        const status = deleted ? "canceled" : sub.status;
        await upsertSubscription(tx, userId, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          plan: priceIsPro && !terminal ? "pro" : "free",
          status,
          priceId,
          currentPeriodEnd: periodEnd(sub),
          cancelAtPeriodEnd: !terminal && !!sub.cancel_at_period_end,
          pastDueSince: status === "past_due" ? (existing?.pastDueSince ?? new Date(now()).toISOString()) : null,
          lastEventCreated: event.created,
        });
        return "processed";
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = idOf(invoice.customer);
        const userId = customerId ? await findUserIdByCustomer(tx, customerId) : null;
        if (!userId) return "unmatched";
        const existing = await getSubscription(tx, userId);
        if (!existing || existing.plan !== "pro") return "ignored";
        if (existing.lastEventCreated != null && existing.lastEventCreated > event.created) return "ignored";
        await upsertSubscription(tx, userId, {
          status: "past_due",
          pastDueSince: existing.pastDueSince ?? new Date(now()).toISOString(),
          lastEventCreated: event.created,
        });
        return "processed";
      }

      default:
        return "ignored";
    }
  });
}
