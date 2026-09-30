import "server-only";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { DataGateway } from "./gateway";
import { MemoryKV, PostgresKV, type KV } from "./kv";

type G = typeof globalThis & { __witcarKv?: KV; __witcarGateway?: DataGateway };
const g = globalThis as G;

export function getKV(): KV {
  if (!g.__witcarKv) {
    const env = getEnv();
    // Postgres table api_cache in production, memory locally (D-010: no extra cache service)
    if (env.WITCAR_DB === "postgres") {
      g.__witcarKv = new PostgresKV(getDb);
    } else {
      g.__witcarKv = new MemoryKV();
    }
  }
  return g.__witcarKv;
}

export function getGateway(): DataGateway {
  if (!g.__witcarGateway) {
    const env = getEnv();
    g.__witcarGateway = new DataGateway(getKV(), {
      dailyLimits: {
        "met-norway": env.PROVIDER_DAILY_LIMIT_WEATHER,
        "open-meteo": env.PROVIDER_DAILY_LIMIT_WEATHER,
        nominatim: env.PROVIDER_DAILY_LIMIT_GEO,
        "open-meteo-geo": env.PROVIDER_DAILY_LIMIT_GEO,
        finnhub: env.PROVIDER_DAILY_LIMIT_STOCKS,
        twelvedata: env.PROVIDER_DAILY_LIMIT_STOCKS,
        coinmarketcap: env.PROVIDER_DAILY_LIMIT_CRYPTO,
        coingecko: env.PROVIDER_DAILY_LIMIT_CRYPTO,
        ecb: env.PROVIDER_DAILY_LIMIT_FX,
      },
    });
  }
  return g.__witcarGateway;
}
