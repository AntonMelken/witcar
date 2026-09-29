import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/auth/supabase";
import { RULES } from "@/lib/cache/rateLimit";
import { getEnv } from "@/lib/env";
import { handler, HttpError, ok } from "@/lib/http/route";

/**
 * Magic-link landing (/auth/confirm) hands over the tokens from the URL
 * fragment; Supabase validates them and the session becomes cookies.
 * Same-origin only (handler CSRF check), so other sites cannot log a visitor
 * into a foreign account.
 */
export const POST = handler(
  {
    auth: "none",
    body: z.object({ accessToken: z.string().min(20).max(4096), refreshToken: z.string().min(6).max(512) }),
    rateLimit: { rule: RULES.loginVerify, by: "ip" },
  },
  async ({ body }) => {
    if (getEnv().WITCAR_AUTH !== "supabase") throw new HttpError(400, "dev_auth");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.setSession({
      access_token: body.accessToken,
      refresh_token: body.refreshToken,
    });
    if (error) throw new HttpError(400, "invalid_session");
    return ok({ ok: true });
  },
);
