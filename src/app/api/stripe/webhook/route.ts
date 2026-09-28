import type Stripe from "stripe";
import { getWebhookVerifier, proPriceIds } from "@/lib/billing/stripe";
import { processStripeEvent } from "@/lib/billing/webhook";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { errorResponse, ok } from "@/lib/http/route";
import { logError, logInfo } from "@/lib/log";

/**
 * Stripe webhook: signature-verified, idempotent (event id log), the only
 * writer of the subscriptions table (§15.2). No CSRF check: Stripe signs it.
 */
export async function POST(req: Request) {
  const secret = getEnv().STRIPE_WEBHOOK_SECRET;
  if (!secret) return errorResponse(503, "billing_not_configured");
  const signature = req.headers.get("stripe-signature");
  if (!signature) return errorResponse(400, "missing_signature");

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = getWebhookVerifier().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return errorResponse(400, "invalid_signature");
  }

  try {
    const db = await getDb();
    const outcome = await processStripeEvent(db, event, { proPriceIds: proPriceIds() });
    logInfo("stripe", "webhook", { type: event.type, outcome });
    return ok({ received: true, outcome });
  } catch (err) {
    logError("stripe", err, { type: event.type });
    // 500 -> Stripe retries; the transaction was rolled back
    return errorResponse(500, "processing_failed");
  }
}
