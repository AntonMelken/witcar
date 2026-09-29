import { z } from "zod";
import { createSupabaseEmailClient } from "@/lib/auth/supabase";
import { RULES } from "@/lib/cache/rateLimit";
import { getEnv, siteUrl } from "@/lib/env";
import { handler, HttpError, ok } from "@/lib/http/route";
import { logWarn } from "@/lib/log";
import { safeNext } from "@/lib/auth/redirect";

/**
 * Sends the sign-in e-mail: a link that works in any browser plus a one-time
 * code for typing into the browser that asked (car). Rate limited per IP (§8.3, §16.1).
 */
export const POST = handler(
  {
    auth: "none",
    body: z.object({ email: z.email().max(254), next: z.string().max(200).optional() }),
    rateLimit: { rule: RULES.magicLink, by: "ip" },
  },
  async ({ body }) => {
    if (getEnv().WITCAR_AUTH !== "supabase")
      throw new HttpError(400, "dev_auth", "Magic link disabled in dev auth mode");
    const callback = new URL("/auth/callback", siteUrl());
    callback.searchParams.set("next", safeNext(body.next));
    const { error } = await createSupabaseEmailClient().auth.signInWithOtp({
      email: body.email,
      options: { emailRedirectTo: callback.toString(), shouldCreateUser: true },
    });
    if (error) {
      logWarn("auth", "magic link failed", { status: error.status, code: error.code });
      if (error.status === 429) throw new HttpError(429, "rate_limited");
      throw new HttpError(502, "magic_link_failed");
    }
    return ok({ ok: true });
  },
);
