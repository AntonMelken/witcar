import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

describe("env validation", () => {
  it("defaults to the local backend in development", () => {
    const env = parseEnv({ NODE_ENV: "development" });
    expect(env.WITCAR_DB).toBe("pglite");
    expect(env.WITCAR_AUTH).toBe("dev");
    expect(env.STOCKS_PROVIDER).toBe("mock");
  });

  it("fails a production build without database/auth config", () => {
    expect(() => parseEnv({ NODE_ENV: "production" })).toThrow(/Production build without DATABASE_URL/);
  });

  it("requires supabase keys when supabase auth is selected", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        WITCAR_AUTH: "supabase",
        DATABASE_URL: "postgres://x",
        NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      }),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
    expect(() => parseEnv({ WITCAR_AUTH: "supabase", WITCAR_DB: "pglite" })).toThrow(/needs the Supabase database/);
    // partial Supabase config (secrets not filled in yet) keeps the local backend
    const partial = parseEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_x",
    });
    expect(partial.WITCAR_AUTH).toBe("dev");
    expect(partial.WITCAR_DB).toBe("pglite");
    const ok = parseEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://x",
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      NEXT_PUBLIC_SITE_URL: "https://witcar.example",
    });
    expect(ok.WITCAR_DB).toBe("postgres");
    expect(ok.WITCAR_AUTH).toBe("supabase");
    expect(ok.WEATHER_PROVIDER).toBe("open-meteo");
  });

  it("refuses Stripe live keys until the owner says GO LIVE", () => {
    expect(() => parseEnv({ STRIPE_SECRET_KEY: "sk_live_123" })).toThrow(/GO LIVE/);
    expect(parseEnv({ STRIPE_SECRET_KEY: "sk_live_123", WITCAR_STRIPE_LIVE: "GO_LIVE" }).STRIPE_SECRET_KEY).toBe(
      "sk_live_123",
    );
    expect(parseEnv({ STRIPE_SECRET_KEY: "sk_test_123" }).STRIPE_SECRET_KEY).toBe("sk_test_123");
  });

  it("validates secrets and paired KV settings", () => {
    expect(() => parseEnv({ WITCAR_SESSION_SECRET: "short" })).toThrow(/32/);
    expect(() => parseEnv({ KV_REST_API_URL: "https://kv" })).toThrow(/together/);
  });
});
