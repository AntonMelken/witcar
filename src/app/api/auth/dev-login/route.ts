import { cookies } from "next/headers";
import { z } from "zod";
import { DEV_SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookies";
import { encodeDevSession } from "@/lib/auth/dev";
import { getDb } from "@/lib/db";
import { getEnv, sessionSecret } from "@/lib/env";
import { handler, HttpError, ok } from "@/lib/http/route";
import { ensureProfile } from "@/lib/repo/profiles";

const MAX_AGE = 30 * 24 * 3600;

/** LOCAL/CI ONLY (WITCAR_AUTH=dev): instant login without e-mail. */
export const POST = handler({ auth: "none", body: z.object({ email: z.email().max(254) }) }, async ({ body }) => {
  if (getEnv().WITCAR_AUTH !== "dev") throw new HttpError(404, "not_found");
  const db = await getDb();
  const email = body.email.toLowerCase();
  await db.query("insert into auth.users (email) values ($1) on conflict (email) do nothing", [email]);
  const [user] = await db.query<{ id: string }>("select id from auth.users where email = $1", [email]);
  await ensureProfile(db, user!.id);
  const jar = await cookies();
  jar.set(
    DEV_SESSION_COOKIE,
    encodeDevSession({ uid: user!.id, email, exp: Date.now() + MAX_AGE * 1000 }, sessionSecret()),
    sessionCookieOptions(MAX_AGE),
  );
  return ok({ ok: true, userId: user!.id });
});
