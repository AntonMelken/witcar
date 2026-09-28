import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/auth/supabase";
import { RULES } from "@/lib/cache/rateLimit";
import { getEnv, siteUrl } from "@/lib/env";
import { handler, HttpError, ok } from "@/lib/http/route";
import { logWarn } from "@/lib/log";
import { safeNext } from "@/lib/auth/redirect";

/** Sends a Supabase magic link (PKCE). Rate limited per IP (§8.3, §16.1). */
export const POST = handler(
  {
    auth: "none",
    body: z.object({ email: z.email().max(254), next: z.string().max(200).optional() }),
    rateLimit: { rule: RULES.magicLink, by: "ip" },
  },
  async ({ body }) => {
    if (getEnv().WITCAR_AUTH !== "supabase")
      throw new HttpError(400, "dev_auth", "Magic link disabled in dev auth mode");
    const supabase = await createSupabaseServerClient();
    const callback = new URL("/auth/callback", siteUrl());
    callback.searchParams.set("next", safeNext(body.next));
    const { error } = await supabase.auth.signInWithOtp({
      email: body.email,
      options: { emailRedirectTo: callback.toString(), shouldCreateUser: true },
    });
    if (error) {
      logWarn("auth", "magic link failed", { status: error.status });
      throw new HttpError(error.status === 429 ? 429 : 502, "magic_link_failed");
    }
    return ok({ ok: true });
  },
);
