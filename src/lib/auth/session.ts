import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { getEnv, sessionSecret } from "@/lib/env";
import { findActiveDeviceByTokenHash, touchDevice } from "@/lib/repo/devices";
import { SESSION_COOKIE, DEVICE_COOKIE } from "./cookies";
import { decodeSession } from "./name";
import { createSupabaseServerClient } from "./supabase";
import { sha256 } from "./tokens";

export type Principal =
  | { kind: "user"; userId: string; email: string | null; name?: string }
  | { kind: "device"; userId: string; deviceId: string };

/** Signed-in user: name session cookie (default) or Supabase Auth (legacy mode). */
export const getUserSession = cache(async (): Promise<Extract<Principal, { kind: "user" }> | null> => {
  const env = getEnv();
  if (env.WITCAR_AUTH === "name") {
    const jar = await cookies();
    const s = decodeSession(jar.get(SESSION_COOKIE)?.value, sessionSecret());
    return s ? { kind: "user", userId: s.uid, email: null, name: s.name } : null;
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || typeof sub !== "string") return null;
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;
  return { kind: "user", userId: sub, email };
});

/** Paired car/browser device via the HttpOnly device token cookie. */
export const getDevicePrincipal = cache(async (): Promise<Extract<Principal, { kind: "device" }> | null> => {
  const jar = await cookies();
  const token = jar.get(DEVICE_COOKIE)?.value;
  if (!token || token.length < 20 || token.length > 200) return null;
  const db = await getDb();
  const device = await findActiveDeviceByTokenHash(db, sha256(token));
  if (!device) return null;
  await touchDevice(db, device.id);
  return { kind: "device", userId: device.userId, deviceId: device.id };
});

export const getPrincipal = cache(async (): Promise<Principal | null> => {
  return (await getUserSession()) ?? (await getDevicePrincipal());
});

/** For pages that need a phone/desktop login (settings, billing, link). */
export async function requireUserPage(next: string) {
  const user = await getUserSession();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requirePrincipalPage(next: string) {
  const p = await getPrincipal();
  if (!p) redirect(`/login?next=${encodeURIComponent(next)}`);
  return p;
}
