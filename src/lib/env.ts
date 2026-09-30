import { createHash } from "node:crypto";
import { z } from "zod";

/**
 * Server environment, validated with zod. Imported by next.config.ts so a
 * production build fails fast when required values are missing.
 *
 * Backends:
 * - WITCAR_DB=postgres  -> DATABASE_URL (Supabase Postgres via pooler) required
 * - WITCAR_DB=pglite    -> in-process Postgres (local dev, CI, E2E only)
 * - WITCAR_AUTH=name    -> sign in with a name only (default): signed session cookie, no e-mail, no password
 * - WITCAR_AUTH=supabase-> Supabase Auth (magic link), optional legacy mode
 * - WITCAR_OPEN_ACCESS  -> everybody gets the full feature set (default on); "0" restores Free/Pro limits
 */

const bool = z
  .enum(["0", "1", "true", "false"])
  .optional()
  .transform((v) => v === "1" || v === "true");

/** Boolean env that is ON unless explicitly switched off. */
const boolDefaultOn = z
  .enum(["0", "1", "true", "false"])
  .optional()
  .transform((v) => (v === undefined ? true : v === "1" || v === "true"));

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const optionalInt = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? Number.parseInt(v, 10) : fallback))
    .pipe(z.number().int().nonnegative());

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),

    WITCAR_DB: z.enum(["postgres", "pglite"]).optional(),
    DATABASE_URL: optionalString,
    PGLITE_DATA_DIR: optionalString,

    WITCAR_AUTH: z.enum(["name", "supabase"]).optional(),
    /** true: no plan limits for anybody (name-only accounts, no payment for now) */
    WITCAR_OPEN_ACCESS: boolDefaultOn,
    WITCAR_ALLOW_DEV_BACKEND: bool,
    WITCAR_SESSION_SECRET: optionalString,

    NEXT_PUBLIC_SUPABASE_URL: optionalString,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
    SUPABASE_SERVICE_ROLE_KEY: optionalString,

    STRIPE_SECRET_KEY: optionalString,
    STRIPE_WEBHOOK_SECRET: optionalString,
    STRIPE_PRICE_PRO_MONTHLY: optionalString,
    STRIPE_PRICE_PRO_YEARLY: optionalString,
    /** Must be exactly "GO_LIVE" before a sk_live_ key is accepted (owner rule). */
    WITCAR_STRIPE_LIVE: optionalString,

    // Data providers (D-007..D-009, D-031). Free + commercial by default:
    // MET Norway (weather), Nominatim/OSM (city search), CoinMarketCap Basic, ECB.
    WEATHER_PROVIDER: z.enum(["met-norway", "open-meteo", "mock"]).optional(),
    WEATHER_API_KEY: optionalString,
    /** contact (e-mail or URL) appended to the User-Agent for MET Norway / Nominatim */
    PROVIDER_CONTACT: optionalString,
    /**
     * twelvedata = quotes, search and price history (needs STOCKS_API_KEY); finnhub = quotes/search only;
     * mock = clearly labeled demo data; off = hide stocks (D-008, D-033)
     */
    STOCKS_PROVIDER: z.enum(["twelvedata", "finnhub", "mock", "off"]).optional(),
    STOCKS_API_KEY: optionalString,
    CRYPTO_PROVIDER: z.enum(["coinmarketcap", "coingecko", "mock"]).optional(),
    CMC_API_KEY: optionalString,
    CRYPTO_API_KEY: optionalString,
    CRYPTO_API_PLAN: z.enum(["demo", "pro"]).default("demo"),
    FX_PROVIDER: z.enum(["ecb", "mock"]).optional(),

    // Twelve Data free: 800 credits/day, 8/min; stay below
    PROVIDER_DAILY_LIMIT_STOCKS: optionalInt(700),
    PROVIDER_DAILY_LIMIT_WEATHER: optionalInt(5000),
    // CoinMarketCap Basic: 15,000 credits/month; 450/day stays below it
    PROVIDER_DAILY_LIMIT_CRYPTO: optionalInt(450),
    PROVIDER_DAILY_LIMIT_GEO: optionalInt(2000),
    PROVIDER_DAILY_LIMIT_FX: optionalInt(100),

    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
  })
  .transform((env) => {
    const db = env.WITCAR_DB ?? (env.DATABASE_URL ? "postgres" : "pglite");
    const auth = env.WITCAR_AUTH ?? "name";
    return {
      ...env,
      WITCAR_DB: db,
      WITCAR_AUTH: auth,
      // local/CI (PGlite) uses mocks; a real deployment uses the free commercial sources
      WEATHER_PROVIDER: env.WEATHER_PROVIDER ?? (db === "pglite" ? "mock" : "met-norway"),
      FX_PROVIDER: env.FX_PROVIDER ?? (db === "pglite" ? "mock" : "ecb"),
      // without a key stocks still work, as clearly labeled demo data (D-033)
      STOCKS_PROVIDER: env.STOCKS_PROVIDER ?? (env.STOCKS_API_KEY ? "twelvedata" : "mock"),
      CRYPTO_PROVIDER:
        env.CRYPTO_PROVIDER ?? (env.CMC_API_KEY ? "coinmarketcap" : env.CRYPTO_API_KEY ? "coingecko" : "mock"),
    } as const;
  })
  .superRefine((env, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", message });
    const isProd = env.NODE_ENV === "production";

    if (env.WITCAR_DB === "postgres" && !env.DATABASE_URL) {
      issue("DATABASE_URL is required when WITCAR_DB=postgres");
    }
    if (env.WITCAR_AUTH === "supabase" && env.WITCAR_DB !== "postgres") {
      issue("WITCAR_AUTH=supabase needs the Supabase database (DATABASE_URL): users live in auth.users there");
    }
    if (env.WITCAR_AUTH === "supabase") {
      if (!env.NEXT_PUBLIC_SUPABASE_URL) issue("NEXT_PUBLIC_SUPABASE_URL is required");
      if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY) issue("NEXT_PUBLIC_SUPABASE_ANON_KEY is required");
      if (!env.SUPABASE_SERVICE_ROLE_KEY) issue("SUPABASE_SERVICE_ROLE_KEY is required");
    }
    if (isProd && env.WITCAR_DB === "pglite" && !env.WITCAR_ALLOW_DEV_BACKEND) {
      issue(
        "Production build without DATABASE_URL. Set the production env " +
          "(see .env.example) or WITCAR_ALLOW_DEV_BACKEND=1 for CI/E2E builds only.",
      );
    }
    // name accounts are identified by a signed cookie: production needs a secret (own or derived from the service key)
    if (env.WITCAR_AUTH === "name" && isProd && !env.WITCAR_SESSION_SECRET && !env.SUPABASE_SERVICE_ROLE_KEY) {
      issue("WITCAR_SESSION_SECRET (or SUPABASE_SERVICE_ROLE_KEY) is required to sign name sessions in production");
    }
    if (env.WITCAR_SESSION_SECRET && env.WITCAR_SESSION_SECRET.length < 32) {
      issue("WITCAR_SESSION_SECRET must be at least 32 characters");
    }
    if (env.STRIPE_SECRET_KEY?.startsWith("sk_live_") && env.WITCAR_STRIPE_LIVE !== "GO_LIVE") {
      issue("Stripe live key refused: owner has not confirmed GO LIVE (WITCAR_STRIPE_LIVE=GO_LIVE)");
    }
    if ((env.STOCKS_PROVIDER === "twelvedata" || env.STOCKS_PROVIDER === "finnhub") && !env.STOCKS_API_KEY) {
      issue(`STOCKS_PROVIDER=${env.STOCKS_PROVIDER} needs STOCKS_API_KEY`);
    }
    if (env.CRYPTO_PROVIDER === "coinmarketcap" && !env.CMC_API_KEY) {
      issue("CRYPTO_PROVIDER=coinmarketcap needs CMC_API_KEY (free Basic key from coinmarketcap.com/api)");
    }
  });

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

export function parseEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  const result = schema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join(".") || "env"}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }
  return result.data;
}

export function getEnv(): ServerEnv {
  if (!cached) cached = parseEnv();
  return cached;
}

/** Test helper: forget the memoized env so a test can change process.env. */
export function resetEnvCache(): void {
  cached = null;
}

const DEV_FALLBACK_SECRET = "witcar-local-dev-secret-change-me-0123456789";

/**
 * HMAC key for the name-session cookie. Prefers WITCAR_SESSION_SECRET; without
 * it (existing deployments) a key is derived from the server-only service key,
 * so no new secret has to be configured. Local dev falls back to a fixed value.
 */
export function sessionSecret(): string {
  const env = getEnv();
  if (env.WITCAR_SESSION_SECRET) return env.WITCAR_SESSION_SECRET;
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    return createHash("sha256").update(`witcar-session-v1:${env.SUPABASE_SERVICE_ROLE_KEY}`).digest("hex");
  }
  return DEV_FALLBACK_SECRET;
}

export function siteUrl(): URL {
  return new URL(getEnv().NEXT_PUBLIC_SITE_URL);
}

export function isSecureSite(): boolean {
  return siteUrl().protocol === "https:";
}
