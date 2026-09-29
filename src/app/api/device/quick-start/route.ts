import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { DEVICE_COOKIE, DEVICE_COOKIE_MAX_AGE, sessionCookieOptions } from "@/lib/auth/cookies";
import { RULES } from "@/lib/cache/rateLimit";
import { getDb } from "@/lib/db";
import { handler, ok } from "@/lib/http/route";
import { isPresetId } from "@/lib/presets";
import { startCarWithoutAccount } from "@/lib/services/carStart";

/**
 * "Sofort starten" in the car: no e-mail, no phone. Creates a car-only account
 * with a starter dashboard and sets the HttpOnly device cookie (§8.2).
 */
export const POST = handler(
  {
    auth: "none",
    body: z.object({ preset: z.string().max(40).optional() }),
    rateLimit: { rule: RULES.quickStart, by: "ip" },
  },
  async ({ body }) => {
    const db = await getDb();
    const preset = body.preset && isPresetId(body.preset) ? body.preset : null;
    const t = await getTranslations("onboarding");
    const { deviceToken } = await startCarWithoutAccount(db, preset, t("layoutName"));
    const jar = await cookies();
    jar.set(DEVICE_COOKIE, deviceToken, sessionCookieOptions(DEVICE_COOKIE_MAX_AGE));
    return ok({ ok: true });
  },
);
