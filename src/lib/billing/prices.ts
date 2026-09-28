import "server-only";
import { getEnv } from "@/lib/env";
import { getStripe } from "./stripe";

export interface DisplayPrice {
  interval: "monthly" | "yearly";
  amount: string;
}

let cache: { at: number; prices: DisplayPrice[] } | null = null;

/**
 * Prices are read from Stripe (single source of truth, never hard-coded, §15.1).
 * Gross = final price (Kleinunternehmer §19 UStG, no VAT shown).
 */
export async function getDisplayPrices(): Promise<DisplayPrice[]> {
  if (cache && Date.now() - cache.at < 3600_000) return cache.prices;
  const stripe = getStripe();
  const env = getEnv();
  if (!stripe) return [];
  const ids: [DisplayPrice["interval"], string | undefined][] = [
    ["monthly", env.STRIPE_PRICE_PRO_MONTHLY],
    ["yearly", env.STRIPE_PRICE_PRO_YEARLY],
  ];
  const prices: DisplayPrice[] = [];
  for (const [interval, id] of ids) {
    if (!id) continue;
    try {
      const p = await stripe.prices.retrieve(id);
      if (p.unit_amount == null) continue;
      prices.push({
        interval,
        amount: new Intl.NumberFormat("de-DE", { style: "currency", currency: p.currency.toUpperCase() }).format(
          p.unit_amount / 100,
        ),
      });
    } catch {
      // unknown price id / network: show "price follows"
    }
  }
  cache = { at: Date.now(), prices };
  return prices;
}
