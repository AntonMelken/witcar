import type { CryptoQuote } from "@/widgets/crypto/definition";
import type { StockQuote } from "@/widgets/stocks/definition";
import { getJson, seeded, UpstreamError, type FetchLike, type Provider } from "./types";

// ---------------------------------------------------------------------------
// Stocks
// ---------------------------------------------------------------------------

interface FinnhubQuote {
  c: number; // current price
  d: number | null; // change
  dp: number | null; // percent change
  pc: number; // previous close
  t: number; // unix seconds
}

/**
 * Finnhub /quote. Free tier is personal/non-commercial only -> paid plan or
 * other vendor needed before go-live (D-008, gate G2). Quotes shown as delayed.
 */
export function finnhubStocks(apiKey: string, fetchImpl: FetchLike = fetch): Provider<{ symbol: string }, StockQuote> {
  return {
    id: "finnhub",
    ttlMs: 2 * 60_000,
    maxStaleMs: 24 * 3600_000,
    cacheKey: (i) => `stock:${i.symbol}`,
    async fetch(i, signal) {
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(i.symbol)}`;
      const q = await getJson<FinnhubQuote>(fetchImpl, url, { signal, headers: { "X-Finnhub-Token": apiKey } });
      // Finnhub answers unknown symbols with zeros
      if (typeof q.c !== "number" || (q.c === 0 && q.t === 0)) throw new UpstreamError("finnhub: unknown symbol", 404);
      return {
        symbol: i.symbol,
        price: q.c,
        change: q.d ?? null,
        changePct: q.dp ?? null,
        currency: null,
        asOf: q.t ? new Date(q.t * 1000).toISOString() : null,
      };
    },
  };
}

export function mockStocks(now: () => number = Date.now): Provider<{ symbol: string }, StockQuote> {
  return {
    id: "mock",
    ttlMs: 2 * 60_000,
    maxStaleMs: 24 * 3600_000,
    cacheKey: (i) => `mock-stock:${i.symbol}`,
    async fetch(i) {
      const bucket = Math.floor(now() / 120_000);
      const base = 20 + seeded(i.symbol) * 480;
      const drift = (seeded(`${i.symbol}:${bucket}`) - 0.5) * 0.06;
      const price = Math.round(base * (1 + drift) * 100) / 100;
      const change = Math.round((price - base) * 100) / 100;
      return {
        symbol: i.symbol,
        price,
        change,
        changePct: Math.round((change / base) * 10000) / 100,
        currency: "USD",
        asOf: new Date(bucket * 120_000).toISOString(),
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Crypto
// ---------------------------------------------------------------------------

type CoinGeckoSimplePrice = Record<string, Record<string, number | null | undefined>>;

/**
 * CoinGecko /simple/price. Terms require the attribution "Powered by CoinGecko"
 * (shown in the widget) and allow use inside paid products (D-009).
 */
export function coingeckoCrypto(
  apiKey: string | undefined,
  plan: "demo" | "pro",
  fetchImpl: FetchLike = fetch,
): Provider<{ id: string; vs: "eur" | "usd" }, CryptoQuote> {
  const host = plan === "pro" ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";
  const header = plan === "pro" ? "x-cg-pro-api-key" : "x-cg-demo-api-key";
  return {
    id: "coingecko",
    ttlMs: 90_000,
    maxStaleMs: 24 * 3600_000,
    cacheKey: (i) => `crypto:${i.id}:${i.vs}`,
    async fetch(i, signal) {
      const params = new URLSearchParams({
        ids: i.id,
        vs_currencies: i.vs,
        include_24hr_change: "true",
        include_last_updated_at: "true",
      });
      const body = await getJson<CoinGeckoSimplePrice>(fetchImpl, `${host}/simple/price?${params}`, {
        signal,
        headers: apiKey ? { [header]: apiKey } : {},
      });
      const coin = body[i.id];
      const price = coin?.[i.vs];
      if (typeof price !== "number") throw new UpstreamError("coingecko: unknown coin", 404);
      const updated = coin?.last_updated_at;
      return {
        id: i.id,
        price,
        change24hPct: typeof coin?.[`${i.vs}_24h_change`] === "number" ? (coin[`${i.vs}_24h_change`] as number) : null,
        currency: i.vs,
        asOf: typeof updated === "number" ? new Date(updated * 1000).toISOString() : null,
      };
    },
  };
}

interface CmcListing {
  data?: {
    slug: string;
    quote?: Record<string, { price?: number | null; percent_change_24h?: number | null; last_updated?: string }>;
  }[];
}

/**
 * CoinMarketCap Basic (free, commercial use for one product, D-009): ONE call
 * returns the top 250 coins (1 credit) and is shared by every user and coin.
 * TTL 10 min -> max. 144 calls/day per currency (15,000 credits/month).
 * Coins are addressed by slug ("bitcoin", "ethereum"), like the widget config.
 */
export function coinmarketcapListings(
  apiKey: string,
  fetchImpl: FetchLike = fetch,
): Provider<{ vs: "eur" | "usd" }, Record<string, CryptoQuote>> {
  return {
    id: "coinmarketcap",
    ttlMs: 10 * 60_000,
    maxStaleMs: 24 * 3600_000,
    cacheKey: (i) => `crypto-top:${i.vs}`,
    async fetch(i, signal) {
      const convert = i.vs.toUpperCase();
      const params = new URLSearchParams({ start: "1", limit: "250", convert });
      const body = await getJson<CmcListing>(
        fetchImpl,
        `https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest?${params}`,
        { signal, headers: { "x-cmc_pro_api_key": apiKey } },
      );
      const out: Record<string, CryptoQuote> = {};
      for (const coin of body.data ?? []) {
        const q = coin.quote?.[convert];
        if (typeof q?.price !== "number") continue;
        out[coin.slug] = {
          id: coin.slug,
          price: q.price,
          change24hPct: typeof q.percent_change_24h === "number" ? q.percent_change_24h : null,
          currency: i.vs,
          asOf: q.last_updated ?? null,
        };
      }
      if (Object.keys(out).length === 0) throw new UpstreamError("coinmarketcap: unexpected payload");
      return out;
    },
  };
}

export function mockCrypto(now: () => number = Date.now): Provider<{ id: string; vs: "eur" | "usd" }, CryptoQuote> {
  return {
    id: "mock",
    ttlMs: 90_000,
    maxStaleMs: 24 * 3600_000,
    cacheKey: (i) => `mock-crypto:${i.id}:${i.vs}`,
    async fetch(i) {
      const bucket = Math.floor(now() / 90_000);
      const base = i.id === "bitcoin" ? 60000 : i.id === "ethereum" ? 3000 : 1 + seeded(i.id) * 200;
      const drift = (seeded(`${i.id}:${bucket}`) - 0.5) * 0.08;
      return {
        id: i.id,
        price: Math.round(base * (1 + drift) * 100) / 100,
        change24hPct: Math.round(drift * 10000) / 100,
        currency: i.vs,
        asOf: new Date(bucket * 90_000).toISOString(),
      };
    },
  };
}
