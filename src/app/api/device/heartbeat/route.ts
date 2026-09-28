import { cookies } from "next/headers";
import { DEVICE_COOKIE, DEVICE_COOKIE_MAX_AGE, sessionCookieOptions } from "@/lib/auth/cookies";
import { getDevicePrincipal } from "@/lib/auth/session";
import { errorResponse, ok } from "@/lib/http/route";

/**
 * Device session check (every 20 s from the dashboard). 401 after revocation;
 * otherwise the cookie is re-issued -> rolling 90-day session (§8.3).
 */
export async function GET() {
  const device = await getDevicePrincipal();
  const jar = await cookies();
  if (!device) {
    if (jar.get(DEVICE_COOKIE)) jar.delete(DEVICE_COOKIE);
    return errorResponse(401, "unauthorized");
  }
  const token = jar.get(DEVICE_COOKIE)!.value;
  jar.set(DEVICE_COOKIE, token, sessionCookieOptions(DEVICE_COOKIE_MAX_AGE));
  return ok({ ok: true });
}
