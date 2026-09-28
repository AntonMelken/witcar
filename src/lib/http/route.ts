import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getPrincipal, getUserSession, type Principal } from "@/lib/auth/session";
import { getKV } from "@/lib/cache";
import { rateLimit, type RateLimitRule } from "@/lib/cache/rateLimit";
import { siteUrl } from "@/lib/env";
import { logError } from "@/lib/log";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message?: string,
    public readonly headers?: Record<string, string>,
  ) {
    super(message ?? code);
  }
}

/** Uniform error body: { error: { code, message } } */
export function errorResponse(status: number, code: string, message?: string, headers?: Record<string, string>) {
  return NextResponse.json(
    { error: { code, message: message ?? code } },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}

export function ok<T>(body: T, init?: { status?: number; headers?: Record<string, string> }) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: { "Cache-Control": "no-store", ...init?.headers },
  });
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * CSRF protection for mutating requests: Origin (or Sec-Fetch-Site) must be
 * same-origin. Combined with SameSite=Lax cookies (masterplan §8.3).
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (origin) {
    let o: URL;
    try {
      o = new URL(origin);
    } catch {
      return false;
    }
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return o.host === host || o.origin === siteUrl().origin;
  }
  return req.headers.get("sec-fetch-site") === "same-origin";
}

type AuthMode = "none" | "optional" | "principal" | "user";

type PrincipalFor<A extends AuthMode> = A extends "user"
  ? Extract<Principal, { kind: "user" }>
  : A extends "principal"
    ? Principal
    : Principal | null;

interface HandlerOptions<B extends z.ZodType | undefined, Q extends z.ZodType | undefined, A extends AuthMode> {
  auth: A;
  body?: B;
  query?: Q;
  /** default: true for POST/PUT/PATCH/DELETE */
  csrf?: boolean;
  rateLimit?: { rule: RateLimitRule; by: "ip" | "principal" };
}

interface HandlerArgs<B, Q, P> {
  req: NextRequest;
  body: B;
  query: Q;
  principal: P;
  params: Record<string, string>;
}

type Infer<T> = T extends z.ZodType ? z.infer<T> : undefined;

/** Route handler wrapper: auth, CSRF, rate limit, zod validation, error mapping. */
export function handler<
  A extends AuthMode,
  B extends z.ZodType | undefined = undefined,
  Q extends z.ZodType | undefined = undefined,
>(opts: HandlerOptions<B, Q, A>, fn: (args: HandlerArgs<Infer<B>, Infer<Q>, PrincipalFor<A>>) => Promise<Response>) {
  return async (req: NextRequest, ctx: { params: Promise<Record<string, string | string[]>> }) => {
    try {
      const mutating = !["GET", "HEAD", "OPTIONS"].includes(req.method);
      if ((opts.csrf ?? mutating) && !isSameOrigin(req)) {
        throw new HttpError(403, "csrf", "Cross-site request blocked");
      }

      let principal: Principal | null = null;
      if (opts.auth === "user") {
        principal = await getUserSession();
        if (!principal) throw new HttpError(401, "unauthorized", "Login required");
      } else if (opts.auth === "principal" || opts.auth === "optional") {
        principal = await getPrincipal();
        if (!principal && opts.auth === "principal") throw new HttpError(401, "unauthorized", "Login required");
      }

      if (opts.rateLimit) {
        const id = opts.rateLimit.by === "principal" && principal ? `u:${principal.userId}` : `ip:${clientIp(req)}`;
        const rl = await rateLimit(getKV(), opts.rateLimit.rule, id);
        if (!rl.ok) {
          throw new HttpError(429, "rate_limited", "Too many requests", { "Retry-After": String(rl.retryAfterSec) });
        }
      }

      let body: unknown = undefined;
      if (opts.body) {
        let raw: unknown;
        try {
          raw = await req.json();
        } catch {
          throw new HttpError(400, "invalid_json", "Body must be JSON");
        }
        const parsed = opts.body.safeParse(raw);
        if (!parsed.success) throw new HttpError(400, "invalid_input", z.prettifyError(parsed.error));
        body = parsed.data;
      }

      let query: unknown = undefined;
      if (opts.query) {
        const parsed = opts.query.safeParse(Object.fromEntries(req.nextUrl.searchParams));
        if (!parsed.success) throw new HttpError(400, "invalid_input", z.prettifyError(parsed.error));
        query = parsed.data;
      }

      const rawParams = ctx?.params ? await ctx.params : {};
      const params: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawParams)) params[k] = Array.isArray(v) ? v.join("/") : v;

      return await fn({
        req,
        body: body as Infer<B>,
        query: query as Infer<Q>,
        principal: principal as PrincipalFor<A>,
        params,
      });
    } catch (err) {
      if (err instanceof HttpError) return errorResponse(err.status, err.code, err.message, err.headers);
      logError("api", err, { path: req.nextUrl.pathname, method: req.method });
      return errorResponse(500, "internal", "Internal error");
    }
  };
}

export const uuidParam = z.uuid();
