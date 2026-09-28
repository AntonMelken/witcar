import "server-only";
import Stripe from "stripe";
import { getEnv } from "@/lib/env";

let client: Stripe | null = null;

/** Stripe client or null when billing is not configured. Test mode until GO LIVE (env.ts). */
export function getStripe(): Stripe | null {
  const env = getEnv();
  if (!env.STRIPE_SECRET_KEY) return null;
  if (!client) client = new Stripe(env.STRIPE_SECRET_KEY, { appInfo: { name: "WitCar" } });
  return client;
}

/** Signature verification only needs the webhook secret, not API access. */
export function getWebhookVerifier(): Stripe {
  return getStripe() ?? new Stripe("sk_test_unused_for_webhook_verification");
}

export function proPriceIds(): Set<string> {
  const env = getEnv();
  return new Set([env.STRIPE_PRICE_PRO_MONTHLY, env.STRIPE_PRICE_PRO_YEARLY].filter((v): v is string => !!v));
}

export function isBillingConfigured(): boolean {
  const env = getEnv();
  return !!(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_PRO_MONTHLY);
}
