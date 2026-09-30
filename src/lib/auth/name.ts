import { hmac, safeEqual, sha256 } from "./tokens";

/**
 * Name-only accounts: a person is identified by a name (no password, no
 * e-mail). The browser keeps a signed session cookie; the name maps to one
 * user row, so the same name on another device reaches the same data.
 * Format of the cookie: base64url(json).signature
 */
export interface NameSession {
  uid: string;
  name: string;
  exp: number;
}

export function encodeSession(session: NameSession, secret: string): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${hmac(secret, payload)}`;
}

export function decodeSession(value: string | undefined, secret: string, now = Date.now()): NameSession | null {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig || !safeEqual(sig, hmac(secret, payload))) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as NameSession;
    if (typeof s.uid !== "string" || typeof s.name !== "string" || typeof s.exp !== "number" || s.exp < now) {
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export const NAME_MIN = 2;
export const NAME_MAX = 32;
const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} ._'’-]*$/u;

/** Display name as typed (trimmed, single spaces) or null when not allowed. */
export function cleanName(input: string): string | null {
  const name = input.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (name.length < NAME_MIN || name.length > NAME_MAX) return null;
  return NAME_PATTERN.test(name) ? name : null;
}

/** Identity of a name: case-insensitive, so "Anton" and "anton " are the same account. */
export function nameKey(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Name accounts live in auth.users like every other account (foreign keys).
 * The row gets a deterministic placeholder address that is never used to send mail.
 */
export function nameEmail(key: string): string {
  return `${sha256(`witcar-name:${key}`)}@name.witcar.invalid`;
}
