import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** Alphabet for user codes: no 0/O/1/I (masterplan §7). */
export const USER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const USER_CODE_LENGTH = 8;

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Uniformly random user code (crypto.randomInt avoids modulo bias). */
export function generateUserCode(): string {
  let out = "";
  for (let i = 0; i < USER_CODE_LENGTH; i++) out += USER_CODE_ALPHABET[randomInt(USER_CODE_ALPHABET.length)];
  return out;
}

/** Case-insensitive, ignores separators. Returns null if not a valid code. */
export function normalizeUserCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  if (code.length !== USER_CODE_LENGTH) return null;
  for (const ch of code) if (!USER_CODE_ALPHABET.includes(ch)) return null;
  return code;
}

export function formatUserCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function hmac(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
