import type { KV } from "./kv";

export interface RateLimitRule {
  name: string;
  limit: number;
  windowSec: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

/** Fixed-window rate limiter on top of KV.incr. `weight` counts several units at once. */
export async function rateLimit(
  kv: KV,
  rule: RateLimitRule,
  id: string,
  now: number = Date.now(),
  weight = 1,
): Promise<RateLimitResult> {
  const windowMs = rule.windowSec * 1000;
  const bucket = Math.floor(now / windowMs);
  const key = `rl:${rule.name}:${id}:${bucket}`;
  const count = await kv.incr(key, rule.windowSec + 1, Math.max(1, Math.floor(weight)));
  const retryAfterSec = Math.max(1, Math.ceil(((bucket + 1) * windowMs - now) / 1000));
  return { ok: count <= rule.limit, remaining: Math.max(0, rule.limit - count), retryAfterSec };
}

/** Rate-limit rules (masterplan §8.3, §11.3). */
export const RULES = {
  deviceStart: { name: "device-start", limit: 10, windowSec: 3600 },
  quickStart: { name: "quick-start", limit: 5, windowSec: 3600 },
  devicePoll: { name: "device-poll", limit: 1, windowSec: 2 },
  deviceApprove: { name: "device-approve", limit: 10, windowSec: 3600 },
  widgetsUser: { name: "widgets", limit: 60, windowSec: 60 },
  widgetsAnon: { name: "widgets-anon", limit: 20, windowSec: 60 },
  geo: { name: "geo", limit: 30, windowSec: 60 },
  magicLink: { name: "magic-link", limit: 5, windowSec: 3600 },
  loginVerify: { name: "login-verify", limit: 10, windowSec: 900 },
  report: { name: "incar-report", limit: 20, windowSec: 3600 },
  ping: { name: "ping", limit: 120, windowSec: 60 },
  write: { name: "write", limit: 120, windowSec: 60 },
} satisfies Record<string, RateLimitRule>;
