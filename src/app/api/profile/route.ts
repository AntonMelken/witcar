import { cookies } from "next/headers";
import { z } from "zod";
import { THEME_COOKIE, themeCookieOptions } from "@/lib/auth/cookies";
import { getDb } from "@/lib/db";
import { handler, HttpError, ok } from "@/lib/http/route";
import { isPresetId } from "@/lib/presets";
import { ensureProfile, getProfile, updateProfile } from "@/lib/repo/profiles";

const patchSchema = z.object({
  displayName: z.string().trim().max(80).nullable().optional(),
  theme: z.enum(["auto", "dark", "light"]).optional(),
  vehiclePreset: z.string().refine(isPresetId, "unknown preset").optional(),
  onboarded: z.literal(true).optional(),
});

export const GET = handler({ auth: "user" }, async ({ principal }) => {
  const db = await getDb();
  return ok({ profile: (await getProfile(db, principal.userId)) ?? (await ensureProfile(db, principal.userId)) });
});

export const PATCH = handler({ auth: "user", body: patchSchema }, async ({ principal, body }) => {
  const db = await getDb();
  await ensureProfile(db, principal.userId);
  const profile = await updateProfile(db, principal.userId, body);
  if (!profile) throw new HttpError(404, "not_found");
  if (body.theme) (await cookies()).set(THEME_COOKIE, body.theme, themeCookieOptions());
  return ok({ profile });
});
