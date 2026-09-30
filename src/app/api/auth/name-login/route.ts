import { cookies } from "next/headers";
import { z } from "zod";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_MAX_AGE,
  THEME_COOKIE,
  sessionCookieOptions,
  themeCookieOptions,
} from "@/lib/auth/cookies";
import { cleanName, encodeSession } from "@/lib/auth/name";
import { RULES } from "@/lib/cache/rateLimit";
import { getDb } from "@/lib/db";
import { getEnv, sessionSecret } from "@/lib/env";
import { handler, HttpError, ok } from "@/lib/http/route";
import { ensureNameAccount } from "@/lib/repo/nameAccounts";

/**
 * Sign in / register with a name only. The same name always reaches the same
 * account (on any device). There is no password: anybody who knows the name
 * can open the account. Accepted by the owner for now (D-034).
 */
export const POST = handler(
  { auth: "none", body: z.object({ name: z.string().max(80) }), rateLimit: { rule: RULES.nameLogin, by: "ip" } },
  async ({ body }) => {
    if (getEnv().WITCAR_AUTH !== "name") throw new HttpError(404, "not_found");
    const name = cleanName(body.name);
    if (!name) throw new HttpError(400, "invalid_name", "Name: 2–32 Zeichen, Buchstaben, Zahlen, Leerzeichen, . _ - '");
    const db = await getDb();
    const account = await ensureNameAccount(db, name);
    const jar = await cookies();
    jar.set(
      SESSION_COOKIE,
      encodeSession(
        {
          uid: account.userId,
          name: account.profile.displayName ?? name,
          exp: Date.now() + SESSION_COOKIE_MAX_AGE * 1000,
        },
        sessionSecret(),
      ),
      sessionCookieOptions(SESSION_COOKIE_MAX_AGE),
    );
    jar.set(THEME_COOKIE, account.profile.theme, themeCookieOptions());
    return ok({ ok: true, userId: account.userId, created: account.created, onboarded: !!account.profile.onboardedAt });
  },
);
