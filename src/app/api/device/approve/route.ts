import { z } from "zod";
import { RULES } from "@/lib/cache/rateLimit";
import { getDb } from "@/lib/db";
import { handler, HttpError, ok } from "@/lib/http/route";
import { approvePairing } from "@/lib/services/pairing";

/** Phone (logged in) confirms the code shown in the car (§8.2 step 4). */
export const POST = handler(
  {
    auth: "user",
    body: z.object({
      userCode: z.string().trim().min(8).max(12),
      label: z.string().trim().max(60).optional(),
    }),
    rateLimit: { rule: RULES.deviceApprove, by: "principal" },
  },
  async ({ body, principal }) => {
    const db = await getDb();
    const result = await approvePairing(db, principal.userId, body.userCode, body.label || null);
    if (!result.ok) {
      const status = result.code === "device_limit" ? 403 : result.code === "invalid_code" ? 400 : 404;
      throw new HttpError(status, result.code);
    }
    return ok({ ok: true });
  },
);
