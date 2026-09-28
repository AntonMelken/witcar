import { getDb } from "@/lib/db";
import { handler, ok } from "@/lib/http/route";
import { recordConsent } from "@/lib/repo/misc";
import { updateProfile } from "@/lib/repo/profiles";

const SAFETY_TEXT_VERSION = "2026-09-28";

/** One-time driving safety notice; allowed from the car (device session) too. */
export const POST = handler({ auth: "principal" }, async ({ principal }) => {
  const db = await getDb();
  await db.tx(async (tx) => {
    await updateProfile(tx, principal.userId, { safetyAck: true });
    await recordConsent(tx, principal.userId, "safety_notice", SAFETY_TEXT_VERSION);
  });
  return ok({ ok: true });
});
