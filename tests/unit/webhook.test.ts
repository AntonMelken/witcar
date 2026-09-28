import type Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import { processStripeEvent } from "@/lib/billing/webhook";
import type { Db } from "@/lib/db/types";
import { effectivePlan } from "@/lib/plan";
import { getSubscription } from "@/lib/repo/subscriptions";
import { createUser, testDb } from "./helpers/db";

let db: Db;
let user: string;
const cfg = { proPriceIds: new Set(["price_pro_m"]) };

const event = (id: string, type: string, object: Record<string, unknown>, created = 1_790_000_000) =>
  ({ id, type, created, data: { object } }) as unknown as Stripe.Event;

const subscription = (status: string, extra: Record<string, unknown> = {}) => ({
  id: "sub_1",
  object: "subscription",
  customer: "cus_1",
  status,
  metadata: { userId: user },
  cancel_at_period_end: false,
  items: { data: [{ price: { id: "price_pro_m" }, current_period_end: 1_792_000_000 }] },
  ...extra,
});

beforeEach(async () => {
  ({ db } = await testDb());
  user = await createUser(db, "buyer@example.com");
});

describe("Stripe webhook processing", () => {
  it("checkout -> pro, cancel -> free, with period end from items", async () => {
    const checkout = event("evt_1", "checkout.session.completed", {
      mode: "subscription",
      client_reference_id: user,
      customer: "cus_1",
      subscription: "sub_1",
      payment_status: "paid",
      metadata: {},
    });
    expect(await processStripeEvent(db, checkout, cfg)).toBe("processed");
    let sub = await getSubscription(db, user);
    expect(sub).toMatchObject({
      plan: "pro",
      status: "active",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
    });

    await processStripeEvent(
      db,
      event("evt_2", "customer.subscription.updated", subscription("active"), 1_790_000_010),
      cfg,
    );
    sub = await getSubscription(db, user);
    expect(sub!.currentPeriodEnd).toBe(new Date(1_792_000_000 * 1000).toISOString());
    expect(effectivePlan(sub)).toBe("pro");

    await processStripeEvent(
      db,
      event("evt_3", "customer.subscription.deleted", subscription("canceled"), 1_790_000_020),
      cfg,
    );
    sub = await getSubscription(db, user);
    expect(sub).toMatchObject({ plan: "free", status: "canceled" });
    expect(effectivePlan(sub)).toBe("free");
  });

  it("replaying an event changes nothing (idempotent)", async () => {
    const e = event("evt_r", "customer.subscription.created", subscription("active"));
    expect(await processStripeEvent(db, e, cfg)).toBe("processed");
    await db.query("update public.subscriptions set status = 'manual-marker' where user_id = $1", [user]);
    expect(await processStripeEvent(db, e, cfg)).toBe("duplicate");
    expect((await getSubscription(db, user))!.status).toBe("manual-marker");
  });

  it("ignores out-of-order (older) subscription events", async () => {
    await processStripeEvent(
      db,
      event("evt_new", "customer.subscription.deleted", subscription("canceled"), 2_000),
      cfg,
    );
    expect(
      await processStripeEvent(
        db,
        event("evt_old", "customer.subscription.updated", subscription("active"), 1_000),
        cfg,
      ),
    ).toBe("ignored");
    expect((await getSubscription(db, user))!.plan).toBe("free");
  });

  it("payment failure keeps pro during the grace period", async () => {
    await processStripeEvent(db, event("e1", "customer.subscription.created", subscription("active"), 1_000), cfg);
    await processStripeEvent(db, event("e2", "invoice.payment_failed", { customer: "cus_1" }, 2_000), cfg);
    const sub = await getSubscription(db, user);
    expect(sub!.status).toBe("past_due");
    expect(sub!.pastDueSince).not.toBeNull();
    expect(effectivePlan(sub)).toBe("pro");
    expect(effectivePlan(sub, Date.parse(sub!.pastDueSince!) + 8 * 24 * 3600_000)).toBe("free");
  });

  it("non-pro prices and unknown customers do not grant pro", async () => {
    const other = subscription("active", {
      items: { data: [{ price: { id: "price_other" }, current_period_end: 1 }] },
    });
    await processStripeEvent(db, event("e1", "customer.subscription.created", other), cfg);
    expect((await getSubscription(db, user))!.plan).toBe("free");
    const stranger = subscription("active", { metadata: {}, customer: "cus_unknown" });
    expect(await processStripeEvent(db, event("e2", "customer.subscription.updated", stranger), cfg)).toBe("unmatched");
    expect(await processStripeEvent(db, event("e3", "charge.refunded", {}), cfg)).toBe("ignored");
  });

  it("rolls back when processing fails so Stripe can retry", async () => {
    const failOnWrite = (inner: Db): Db => ({
      query: <T>(sql: string, params?: readonly unknown[]) =>
        sql.includes("update public.subscriptions") ? Promise.reject(new Error("boom")) : inner.query<T>(sql, params),
      tx: (fn) => inner.tx((tx) => fn(failOnWrite(tx))),
    });
    const e = event("evt_fail", "customer.subscription.created", subscription("active"));
    await expect(processStripeEvent(failOnWrite(db), e, cfg)).rejects.toThrow("boom");
    expect(await db.query("select 1 from public.stripe_events where id = 'evt_fail'")).toHaveLength(0);
    // the retry succeeds
    expect(await processStripeEvent(db, e, cfg)).toBe("processed");
  });
});
