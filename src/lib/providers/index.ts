import "server-only";
import { getGateway, getKV } from "@/lib/cache";
import { ProviderUnavailableError } from "@/lib/cache/gateway";
import { rateLimit } from "@/lib/cache/rateLimit";
import { getEnv } from "@/lib/env";
import type { CryptoQuote } from "@/widgets/crypto/definition";
import type { DataRequest, ProviderResult } from "@/widgets/types";
import { ecbRates, mockFx } from "./fx";
import { coingeckoCrypto, coinmarketcapListings, finnhubStocks, mockCrypto, mockStocks } from "./markets";
import { UpstreamError, type Provider } from "./types";
import {
  metNorwayWeather,
  mockGeocoding,
  mockWeather,
  nominatimGeocoding,
  openMeteoGeocoding,
  openMeteoWeather,
  type GeoResult,
} from "./weather";

type CryptoIn = { id: string; vs: "eur" | "usd" };

interface ProviderSet {
  weather: Provider<{ lat: number; lon: number }, unknown>;
  /** null = switched off (STOCKS_PROVIDER=off, no licensed source) */
  stock: Provider<{ symbol: string }, unknown> | null;
  crypto:
    | { kind: "single"; provider: Provider<CryptoIn, CryptoQuote> }
    | { kind: "listing"; provider: Provider<{ vs: "eur" | "usd" }, Record<string, CryptoQuote>> };
  fx: Provider<Record<string, never>, unknown>;
  geo: Provider<{ q: string; lang: string }, GeoResult[]>;
}

let providers: ProviderSet | null = null;

/** MET Norway and Nominatim require an identifying User-Agent with contact details. */
function userAgent(): string {
  const env = getEnv();
  const contact = env.PROVIDER_CONTACT ? ` ${env.PROVIDER_CONTACT}` : "";
  return `WitCar/0.1 (+${env.NEXT_PUBLIC_SITE_URL}${contact})`;
}

/** Nominatim usage policy: at most 1 request per second across all instances. */
async function nominatimThrottle(): Promise<void> {
  const rule = { name: "nominatim", limit: 1, windowSec: 1 };
  for (let attempt = 0; attempt < 3; attempt++) {
    if ((await rateLimit(getKV(), rule, "global")).ok) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new ProviderUnavailableError("nominatim", "quota_exceeded");
}

export function getProviders(): ProviderSet {
  if (providers) return providers;
  const env = getEnv();
  const ua = userAgent();
  providers = {
    weather:
      env.WEATHER_PROVIDER === "met-norway"
        ? metNorwayWeather(ua)
        : env.WEATHER_PROVIDER === "open-meteo"
          ? openMeteoWeather(env.WEATHER_API_KEY)
          : mockWeather(),
    geo:
      env.WEATHER_PROVIDER === "met-norway"
        ? nominatimGeocoding(ua, nominatimThrottle)
        : env.WEATHER_PROVIDER === "open-meteo"
          ? openMeteoGeocoding(env.WEATHER_API_KEY)
          : mockGeocoding(),
    stock:
      env.STOCKS_PROVIDER === "off"
        ? null
        : env.STOCKS_PROVIDER === "finnhub" && env.STOCKS_API_KEY
          ? finnhubStocks(env.STOCKS_API_KEY)
          : mockStocks(),
    crypto:
      env.CRYPTO_PROVIDER === "coinmarketcap" && env.CMC_API_KEY
        ? { kind: "listing", provider: coinmarketcapListings(env.CMC_API_KEY) }
        : env.CRYPTO_PROVIDER === "coingecko"
          ? { kind: "single", provider: coingeckoCrypto(env.CRYPTO_API_KEY, env.CRYPTO_API_PLAN) }
          : { kind: "single", provider: mockCrypto() },
    fx: env.FX_PROVIDER === "ecb" ? ecbRates() : mockFx(),
  };
  return providers;
}

/** Data sources that are live right now (for the credits on /lizenzen). */
export function activeSources(): string[] {
  const p = getProviders();
  const crypto = p.crypto.provider.id;
  return [p.weather.id, p.geo.id, crypto, p.fx.id, p.stock?.id ?? "off"].filter((id) => id !== "mock" && id !== "off");
}

function through<TIn, TOut>(
  provider: Provider<TIn, TOut>,
  input: TIn,
  background?: (task: Promise<unknown>) => void,
): Promise<ProviderResult<TOut>> {
  return getGateway().get<TOut>({
    provider: provider.id,
    key: `${provider.id}:${provider.cacheKey(input)}`,
    ttlMs: provider.ttlMs,
    maxStaleMs: provider.maxStaleMs,
    fetcher: (signal) => provider.fetch(input, signal),
    background,
  });
}

async function fetchCrypto(req: CryptoIn, background?: (task: Promise<unknown>) => void): Promise<ProviderResult> {
  const c = getProviders().crypto;
  if (c.kind === "single") return through(c.provider, req, background);
  // one shared top-250 listing per currency serves every coin (credit budget)
  const listing = await through(c.provider, { vs: req.vs }, background);
  const quote = listing.data[req.id];
  if (!quote) throw new UpstreamError(`${c.provider.id}: unknown coin`, 404);
  return { ...listing, data: quote };
}

export function fetchData(req: DataRequest, background?: (task: Promise<unknown>) => void): Promise<ProviderResult> {
  const p = getProviders();
  switch (req.kind) {
    case "weather":
      return through(p.weather, req.params, background);
    case "stock":
      if (!p.stock) return Promise.reject(new ProviderUnavailableError("stocks", "disabled"));
      return through(p.stock, req.params, background);
    case "crypto":
      return fetchCrypto(req.params, background);
    case "fx":
      return through(p.fx, req.params, background);
  }
}

export function searchPlaces(q: string, lang: string): Promise<ProviderResult<GeoResult[]>> {
  return through(getProviders().geo, { q, lang });
}
