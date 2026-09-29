import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/auth/supabase";
import { RULES } from "@/lib/cache/rateLimit";
import { getEnv } from "@/lib/env";
import { handler, HttpError, ok } from "@/lib/http/route";

/**
 * One-time code from the sign-in e-mail, typed into the browser that should be
 * logged in (e.g. the car while the mail is read on the phone).
 */
export const POST = handler(
  {
    auth: "none",
    body: z.object({ email: z.email().max(254), code: z.string().regex(/^\d{6,10}$/) }),
    rateLimit: { rule: RULES.loginVerify, by: "ip" },
  },
  async ({ body }) => {
    if (getEnv().WITCAR_AUTH !== "supabase") throw new HttpError(400, "dev_auth");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ email: body.email, token: body.code, type: "email" });
    if (error?.status === 429) throw new HttpError(429, "rate_limited");
    if (error) throw new HttpError(400, "invalid_code");
    return ok({ ok: true });
  },
);
