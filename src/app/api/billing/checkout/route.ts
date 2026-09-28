import { z } from "zod";
import { isBillingConfigured, getStripe } from "@/lib/billing/stripe";
import { getDb } from "@/lib/db";
import { getEnv, siteUrl } from "@/lib/env";
import { handler, HttpError, ok } from "@/lib/http/route";
import { recordConsent } from "@/lib/repo/misc";
import { getSubscription } from "@/lib/repo/subscriptions";
import { getUserPlan } from "@/lib/services/plan";

const WAIVER_TEXT_VERSION = "2026-09-28";

/**
 * Starts Stripe Checkout (subscription mode). The explicit consent to start
 * the service before the withdrawal period ends is required and stored with
 * a timestamp (§15.2). Kleinunternehmer: no tax collection configured.
 */
export const POST = handler(
  {
    auth: "user",
    body: z.object({ interval: z.enum(["monthly", "yearly"]), waiveWithdrawal: z.literal(true) }),
  },
  async ({ principal, body }) => {
    const stripe = getStripe();
    if (!stripe || !isBillingConfigured()) throw new HttpError(503, "billing_not_configured");
    const env = getEnv();
    const price = body.interval === "yearly" ? env.STRIPE_PRICE_PRO_YEARLY : env.STRIPE_PRICE_PRO_MONTHLY;
    if (!price) throw new HttpError(400, "interval_unavailable");

    const db = await getDb();
    const { plan } = await getUserPlan(db, principal.userId);
    if (plan === "pro") throw new HttpError(409, "already_pro");
    const sub = await getSubscription(db, principal.userId);
    await recordConsent(db, principal.userId, "withdrawal_waiver", WAIVER_TEXT_VERSION);

    const base = siteUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      client_reference_id: principal.userId,
      metadata: { userId: principal.userId },
      subscription_data: { metadata: { userId: principal.userId } },
      ...(sub?.stripeCustomerId
        ? { customer: sub.stripeCustomerId }
        : principal.email
          ? { customer_email: principal.email }
          : {}),
      locale: "de",
      allow_promotion_codes: true,
      success_url: new URL("/settings?checkout=success", base).toString(),
      cancel_url: new URL("/pricing?checkout=cancelled", base).toString(),
    });
    if (!session.url) throw new HttpError(502, "checkout_failed");
    return ok({ url: session.url });
  },
);
