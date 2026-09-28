import { hmac, safeEqual } from "./tokens";

/**
 * LOCAL/CI ONLY: signed session cookie used when WITCAR_AUTH=dev (no Supabase).
 * Format: base64url(json).signature
 */
export interface DevSession {
  uid: string;
  email: string;
  exp: number;
}

export function encodeDevSession(session: DevSession, secret: string): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${hmac(secret, payload)}`;
}

export function decodeDevSession(value: string | undefined, secret: string, now = Date.now()): DevSession | null {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig || !safeEqual(sig, hmac(secret, payload))) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DevSession;
    if (typeof s.uid !== "string" || typeof s.exp !== "number" || s.exp < now) return null;
    return s;
  } catch {
    return null;
  }
}
