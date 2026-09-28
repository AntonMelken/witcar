import { cookies } from "next/headers";
import { z } from "zod";
import { DEVICE_COOKIE, DEVICE_COOKIE_MAX_AGE, sessionCookieOptions } from "@/lib/auth/cookies";
import { sha256 } from "@/lib/auth/tokens";
import { getKV } from "@/lib/cache";
import { rateLimit, RULES } from "@/lib/cache/rateLimit";
import { getDb } from "@/lib/db";
import { errorResponse, handler, ok } from "@/lib/http/route";
import { pollPairing } from "@/lib/services/pairing";

/**
 * Car polls every 3 s. On approval the long-lived device token is set as an
 * HttpOnly, Secure, SameSite=Lax cookie; it never reaches JavaScript (§8.2).
 */
export const POST = handler(
  { auth: "none", body: z.object({ deviceCode: z.string().min(20).max(100) }) },
  async ({ body }) => {
    // at most 1 poll per 2 s per device code (RFC 8628 "slow_down")
    const rl = await rateLimit(getKV(), RULES.devicePoll, sha256(body.deviceCode));
    if (!rl.ok) return errorResponse(429, "slow_down", "Polling too fast", { "Retry-After": String(rl.retryAfterSec) });

    const db = await getDb();
    const outcome = await pollPairing(db, body.deviceCode);
    if (outcome.status !== "approved") return ok({ status: outcome.status });

    const jar = await cookies();
    jar.set(DEVICE_COOKIE, outcome.deviceToken, sessionCookieOptions(DEVICE_COOKIE_MAX_AGE));
    return ok({ status: "approved" });
  },
);
