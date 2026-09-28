import { cookies } from "next/headers";
import { DEV_SESSION_COOKIE, DEVICE_COOKIE } from "@/lib/auth/cookies";
import { getDevicePrincipal } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/auth/supabase";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { handler, ok } from "@/lib/http/route";
import { revokeDevice } from "@/lib/repo/devices";

/** Signs out the user session; on a car device the device itself is revoked. */
export const POST = handler({ auth: "none" }, async () => {
  const jar = await cookies();
  const device = await getDevicePrincipal();
  if (device) {
    const db = await getDb();
    await revokeDevice(db, device.userId, device.deviceId);
  }
  jar.delete(DEVICE_COOKIE);
  if (getEnv().WITCAR_AUTH === "dev") jar.delete(DEV_SESSION_COOKIE);
  else await (await createSupabaseServerClient()).auth.signOut();
  return ok({ ok: true });
});
