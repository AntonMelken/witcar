import "server-only";
import { getGateway, getKV } from "@/lib/cache";
import { ProviderUnavailableError } from "@/lib/cache/gateway";
import { rateLimit } from "@/lib/cache/rateLimit";
import { getEnv } from "@/lib/env";
import type { CryptoQuote } from "@/widgets/crypto/definition";
import type { StockHistory, StockMatch, StockQuote, StockRange } from "@/widgets/stocks/definition";
import type { DataRequest, ProviderResult } from "@/widgets/types";
import { ecbRates, mockFx } from "./fx";
import { coingeckoCrypto, coinmarketcapListings, finnhubStocks, mockCrypto } from "./markets";
import {
  finnhubSearch,
  mockStockHistory,
  mockStockQuote,
  mockStockSearch,
  twelveDataHistory,
  twelveDataQuote,
  twelveDataSearch,
} from "./stocks";
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

interface StocksSet {
  quote: Provider<{ symbol: string }, StockQuote>;
  /** null: this vendor has no price history on its free key (Finnhub) */
  history: Provider<{ symbol: string; range: StockRange }, StockHistory> | null;
  search: Provider<{ q: string }, StockMatch[]>;
}

interface ProviderSet {
  weather: Provider<{ lat: number; lon: number }, unknown>;
  /** null = switched off (STOCKS_PROVIDER=off) */
  stocks: StocksSet | null;
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

/** Twelve Data free plan: 8 credits per minute (shared by quotes, history and search). */
async function twelveDataGate(): Promise<void> {
  const rl = await rateLimit(getKV(), { name: "twelvedata-min", limit: 8, windowSec: 60 }, "global");
  if (!rl.ok) throw new ProviderUnavailableError("twelvedata", "quota_exceeded");
}

function buildStocks(): StocksSet | null {
  const env = getEnv();
  switch (env.STOCKS_PROVIDER) {
    case "off":
      return null;
    case "twelvedata":
      return {
        quote: twelveDataQuote(env.STOCKS_API_KEY!, twelveDataGate),
        history: twelveDataHistory(env.STOCKS_API_KEY!, twelveDataGate),
        search: twelveDataSearch(env.STOCKS_API_KEY!, twelveDataGate),
      };
    case "finnhub":
      return {
        quote: finnhubStocks(env.STOCKS_API_KEY!),
        history: null,
        search: finnhubSearch(env.STOCKS_API_KEY!),
      };
    default:
      return { quote: mockStockQuote(), history: mockStockHistory(), search: mockStockSearch() };
  }
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
    stocks: buildStocks(),
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
  const ids = [p.weather.id, p.geo.id, p.crypto.provider.id, p.fx.id, p.stocks?.quote.id ?? "off"];
  return ids.filter((id, k) => id !== "mock" && id !== "off" && ids.indexOf(id) === k);
}

/** Default minimum age before a manual refresh may bypass the cache. */
const DEFAULT_FORCE_MIN_AGE_MS = 120_000;

function through<TIn, TOut>(
  provider: Provider<TIn, TOut>,
  input: TIn,
  background?: (task: Promise<unknown>) => void,
  force = false,
): Promise<ProviderResult<TOut>> {
  return getGateway().get<TOut>({
    provider: provider.id,
    key: `${provider.id}:${provider.cacheKey(input)}`,
    ttlMs: provider.ttlFor?.(input) ?? provider.ttlMs,
    maxStaleMs: provider.maxStaleMs,
    fetcher: (signal) => provider.fetch(input, signal),
    background,
    forceMinAgeMs: force ? (provider.forceMinAgeMs ?? DEFAULT_FORCE_MIN_AGE_MS) : undefined,
  });
}

async function fetchCrypto(
  req: CryptoIn,
  background?: (task: Promise<unknown>) => void,
  force = false,
): Promise<ProviderResult> {
  const c = getProviders().crypto;
  if (c.kind === "single") return through(c.provider, req, background, force);
  // one shared top-250 listing per currency serves every coin (credit budget)
  const listing = await through(c.provider, { vs: req.vs }, background, force);
  const quote = listing.data[req.id];
  if (!quote) throw new UpstreamError(`${c.provider.id}: unknown coin`, 404);
  return { ...listing, data: quote };
}

/** `force`: manual refresh (button); the gateway still protects provider quotas with a minimum age. */
export function fetchData(
  req: DataRequest,
  background?: (task: Promise<unknown>) => void,
  force = false,
): Promise<ProviderResult> {
  const p = getProviders();
  switch (req.kind) {
    case "weather":
      return through(p.weather, req.params, background, force);
    case "stock":
      if (!p.stocks) return Promise.reject(new ProviderUnavailableError("stocks", "disabled"));
      return through(p.stocks.quote, req.params, background, force);
    case "history":
      if (!p.stocks) return Promise.reject(new ProviderUnavailableError("stocks", "disabled"));
      if (!p.stocks.history) return Promise.reject(new ProviderUnavailableError("stocks", "unsupported"));
      return through(p.stocks.history, req.params, background, force);
    case "crypto":
      return fetchCrypto(req.params, background, force);
    case "fx":
      return through(p.fx, req.params, background, force);
  }
}

export function searchPlaces(q: string, lang: string): Promise<ProviderResult<GeoResult[]>> {
  return through(getProviders().geo, { q, lang });
}

export function searchStocks(q: string): Promise<ProviderResult<StockMatch[]>> {
  const p = getProviders();
  if (!p.stocks) return Promise.reject(new ProviderUnavailableError("stocks", "disabled"));
  return through(p.stocks.search, { q });
}
