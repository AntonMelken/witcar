import { getStripe } from "@/lib/billing/stripe";
import { getDb } from "@/lib/db";
import { siteUrl } from "@/lib/env";
import { handler, HttpError, ok } from "@/lib/http/route";
import { getSubscription } from "@/lib/repo/subscriptions";

/** Stripe Customer Portal: cancel, change payment method, invoices. */
export const POST = handler({ auth: "user" }, async ({ principal }) => {
  const stripe = getStripe();
  if (!stripe) throw new HttpError(503, "billing_not_configured");
  const db = await getDb();
  const sub = await getSubscription(db, principal.userId);
  if (!sub?.stripeCustomerId) throw new HttpError(404, "no_customer");
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: new URL("/settings", siteUrl()).toString(),
  });
  return ok({ url: session.url });
});
