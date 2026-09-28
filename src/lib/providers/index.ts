import "server-only";
import { getGateway } from "@/lib/cache";
import { getEnv } from "@/lib/env";
import type { DataRequest, ProviderResult } from "@/widgets/types";
import { coingeckoCrypto, finnhubStocks, mockCrypto, mockStocks } from "./markets";
import type { Provider } from "./types";
import { mockGeocoding, mockWeather, openMeteoGeocoding, openMeteoWeather, type GeoResult } from "./weather";

interface ProviderSet {
  weather: Provider<{ lat: number; lon: number }, unknown>;
  stock: Provider<{ symbol: string }, unknown>;
  crypto: Provider<{ id: string; vs: "eur" | "usd" }, unknown>;
  geo: Provider<{ q: string; lang: string }, GeoResult[]>;
}

let providers: ProviderSet | null = null;

export function getProviders(): ProviderSet {
  if (providers) return providers;
  const env = getEnv();
  providers = {
    weather: env.WEATHER_PROVIDER === "open-meteo" ? openMeteoWeather(env.WEATHER_API_KEY) : mockWeather(),
    geo: env.WEATHER_PROVIDER === "open-meteo" ? openMeteoGeocoding(env.WEATHER_API_KEY) : mockGeocoding(),
    stock: env.STOCKS_PROVIDER === "finnhub" && env.STOCKS_API_KEY ? finnhubStocks(env.STOCKS_API_KEY) : mockStocks(),
    crypto:
      env.CRYPTO_PROVIDER === "coingecko" ? coingeckoCrypto(env.CRYPTO_API_KEY, env.CRYPTO_API_PLAN) : mockCrypto(),
  };
  return providers;
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

export function fetchData(req: DataRequest, background?: (task: Promise<unknown>) => void): Promise<ProviderResult> {
  const p = getProviders();
  switch (req.kind) {
    case "weather":
      return through(p.weather, req.params, background);
    case "stock":
      return through(p.stock, req.params, background);
    case "crypto":
      return through(p.crypto, req.params, background);
  }
}

export function searchPlaces(q: string, lang: string): Promise<ProviderResult<GeoResult[]>> {
  return through(getProviders().geo, { q, lang });
}
