import "server-only";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { DataGateway } from "./gateway";
import { MemoryKV, PostgresKV, UpstashKV, type KV } from "./kv";

type G = typeof globalThis & { __witcarKv?: KV; __witcarGateway?: DataGateway };
const g = globalThis as G;

export function getKV(): KV {
  if (!g.__witcarKv) {
    const env = getEnv();
    if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) {
      g.__witcarKv = new UpstashKV(env.KV_REST_API_URL, env.KV_REST_API_TOKEN);
    } else if (env.WITCAR_DB === "postgres") {
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
        "open-meteo": env.PROVIDER_DAILY_LIMIT_WEATHER,
        "open-meteo-geo": env.PROVIDER_DAILY_LIMIT_GEO,
        finnhub: env.PROVIDER_DAILY_LIMIT_STOCKS,
        coingecko: env.PROVIDER_DAILY_LIMIT_CRYPTO,
      },
    });
  }
  return g.__witcarGateway;
}
