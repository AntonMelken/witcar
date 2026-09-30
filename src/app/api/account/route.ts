import { cookies } from "next/headers";
import { z } from "zod";
import { SESSION_COOKIE, DEVICE_COOKIE } from "@/lib/auth/cookies";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/auth/supabase";
import { getStripe } from "@/lib/billing/stripe";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { handler, HttpError, ok } from "@/lib/http/route";
import { logError } from "@/lib/log";
import { deleteAuthUserRow } from "@/lib/repo/misc";
import { getSubscription } from "@/lib/repo/subscriptions";

/**
 * Account deletion (GDPR Art. 17): ends the Stripe subscription, deletes the
 * Stripe customer, then the auth user; all app data cascades.
 */
export const DELETE = handler(
  { auth: "user", body: z.object({ confirm: z.literal("LÖSCHEN") }) },
  async ({ principal }) => {
    const db = await getDb();
    const sub = await getSubscription(db, principal.userId);
    const stripe = getStripe();
    if (sub?.stripeCustomerId) {
      if (!stripe) throw new HttpError(503, "billing_not_configured", "Stripe needed to close the customer");
      try {
        if (sub.stripeSubscriptionId && sub.status !== "canceled") {
          await stripe.subscriptions.cancel(sub.stripeSubscriptionId).catch(() => undefined);
        }
        await stripe.customers.del(sub.stripeCustomerId);
      } catch (err) {
        logError("account", err, { step: "stripe" });
        throw new HttpError(502, "stripe_failed", "Could not close the Stripe customer");
      }
    }

    if (getEnv().WITCAR_AUTH === "supabase") {
      const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(principal.userId);
      if (error) throw new HttpError(502, "auth_delete_failed");
      await (await createSupabaseServerClient()).auth.signOut().catch(() => undefined);
    } else {
      await deleteAuthUserRow(db, principal.userId);
    }
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
    jar.delete(DEVICE_COOKIE);
    return ok({ ok: true });
  },
);
