import type { StockHistory, StockMatch, StockPoint, StockQuote, StockRange } from "@/widgets/stocks/definition";
import { getJson, seeded, UpstreamError, type FetchLike, type Provider } from "./types";

/**
 * Stock data adapters for the stocks app: quotes, price history, symbol search.
 * There is NO free source that may be shown to the public commercially (D-033):
 * free keys are for personal use, so the owner decides which key/plan to use.
 * Until a key is configured everything is served as clearly labeled demo data.
 */

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number.parseFloat(v) : typeof v === "number" ? v : Number.NaN;
  return Number.isFinite(n) ? n : null;
};

// ---------------------------------------------------------------------------
// Twelve Data (free: 800 credits/day, 8/min, personal use; paid business plans allow display)
// ---------------------------------------------------------------------------

const TD_BASE = "https://api.twelvedata.com";

/** interval + number of bars per range; timestamps are requested in UTC */
const TD_RANGES: Record<StockRange, { interval: string; size: number }> = {
  "1T": { interval: "5min", size: 78 },
  "1W": { interval: "1h", size: 40 },
  "1M": { interval: "1day", size: 22 },
  "1J": { interval: "1day", size: 252 },
};

const HISTORY_TTL_MS: Record<StockRange, number> = {
  "1T": 5 * 60_000,
  "1W": 15 * 60_000,
  "1M": 60 * 60_000,
  "1J": 6 * 3600_000,
};

interface TdError {
  status?: string;
  code?: number;
  message?: string;
}

async function td<T>(
  fetchImpl: FetchLike,
  apiKey: string,
  path: string,
  params: Record<string, string>,
  signal: AbortSignal,
  gate?: () => Promise<void>,
): Promise<T> {
  await gate?.();
  const url = `${TD_BASE}${path}?${new URLSearchParams(params)}`;
  // key in the header, never in the URL
  const body = await getJson<T & TdError>(fetchImpl, url, { signal, headers: { Authorization: `apikey ${apiKey}` } });
  // Twelve Data reports errors with HTTP 200 and status "error"
  if (body.status === "error") throw new UpstreamError(`twelvedata: ${body.message ?? body.code}`, body.code);
  return body;
}

interface TdQuote {
  symbol?: string;
  name?: string;
  currency?: string;
  timestamp?: number;
  datetime?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  previous_close?: string;
  change?: string;
  percent_change?: string;
  fifty_two_week?: { low?: string; high?: string };
}

export function twelveDataQuote(
  apiKey: string,
  gate?: () => Promise<void>,
  fetchImpl: FetchLike = fetch,
): Provider<{ symbol: string }, StockQuote> {
  return {
    id: "twelvedata",
    ttlMs: 2 * 60_000,
    maxStaleMs: 24 * 3600_000,
    forceMinAgeMs: 60_000,
    cacheKey: (i) => `stock:${i.symbol}`,
    async fetch(i, signal) {
      const q = await td<TdQuote>(fetchImpl, apiKey, "/quote", { symbol: i.symbol }, signal, gate);
      const price = num(q.close);
      if (price === null) throw new UpstreamError("twelvedata: unexpected payload");
      return {
        symbol: i.symbol,
        price,
        change: num(q.change),
        changePct: num(q.percent_change),
        currency: q.currency ?? null,
        asOf: typeof q.timestamp === "number" ? new Date(q.timestamp * 1000).toISOString() : null,
        name: q.name ?? null,
        open: num(q.open),
        high: num(q.high),
        low: num(q.low),
        prevClose: num(q.previous_close),
        week52High: num(q.fifty_two_week?.high),
        week52Low: num(q.fifty_two_week?.low),
      };
    },
  };
}

interface TdSeries {
  meta?: { currency?: string };
  values?: { datetime: string; close: string }[];
}

export function twelveDataHistory(
  apiKey: string,
  gate?: () => Promise<void>,
  fetchImpl: FetchLike = fetch,
): Provider<{ symbol: string; range: StockRange }, StockHistory> {
  return {
    id: "twelvedata",
    ttlMs: HISTORY_TTL_MS["1W"],
    ttlFor: (i) => HISTORY_TTL_MS[i.range],
    maxStaleMs: 24 * 3600_000,
    forceMinAgeMs: 120_000,
    cacheKey: (i) => `history:${i.symbol}:${i.range}`,
    async fetch(i, signal) {
      const { interval, size } = TD_RANGES[i.range];
      const body = await td<TdSeries>(
        fetchImpl,
        apiKey,
        "/time_series",
        { symbol: i.symbol, interval, outputsize: String(size), timezone: "UTC" },
        signal,
        gate,
      );
      let points: StockPoint[] = (body.values ?? [])
        .map((v) => {
          const t = Date.parse(
            v.datetime.includes(" ") ? `${v.datetime.replace(" ", "T")}Z` : `${v.datetime}T00:00:00Z`,
          );
          const c = num(v.close);
          return Number.isFinite(t) && c !== null ? { t: Math.floor(t / 1000), c } : null;
        })
        .filter((p): p is StockPoint => p !== null)
        .sort((a, b) => a.t - b.t);
      if (i.range === "1T" && points.length) {
        // newest trading day only
        const day = new Date(points[points.length - 1]!.t * 1000).toISOString().slice(0, 10);
        points = points.filter((p) => new Date(p.t * 1000).toISOString().slice(0, 10) === day);
      }
      if (points.length < 2) throw new UpstreamError("twelvedata: no history", 404);
      return { symbol: i.symbol, range: i.range, currency: body.meta?.currency ?? null, points };
    },
  };
}

interface TdSearch {
  data?: { symbol: string; instrument_name?: string; exchange?: string }[];
}

export function twelveDataSearch(
  apiKey: string,
  gate?: () => Promise<void>,
  fetchImpl: FetchLike = fetch,
): Provider<{ q: string }, StockMatch[]> {
  return {
    id: "twelvedata",
    ttlMs: 24 * 3600_000,
    maxStaleMs: 7 * 24 * 3600_000,
    forceMinAgeMs: 3600_000,
    cacheKey: (i) => `search:${i.q.toLowerCase()}`,
    async fetch(i, signal) {
      const body = await td<TdSearch>(
        fetchImpl,
        apiKey,
        "/symbol_search",
        { symbol: i.q, outputsize: "10" },
        signal,
        gate,
      );
      return dedupe(
        (body.data ?? []).map((r) => ({
          symbol: r.symbol.toUpperCase(),
          name: r.instrument_name ?? "",
          exchange: r.exchange ?? "",
        })),
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Finnhub symbol search (free key, personal use only)
// ---------------------------------------------------------------------------

interface FinnhubSearch {
  result?: { description?: string; displaySymbol?: string; symbol?: string; type?: string }[];
}

export function finnhubSearch(apiKey: string, fetchImpl: FetchLike = fetch): Provider<{ q: string }, StockMatch[]> {
  return {
    id: "finnhub",
    ttlMs: 24 * 3600_000,
    maxStaleMs: 7 * 24 * 3600_000,
    forceMinAgeMs: 3600_000,
    cacheKey: (i) => `search:${i.q.toLowerCase()}`,
    async fetch(i, signal) {
      const body = await getJson<FinnhubSearch>(
        fetchImpl,
        `https://finnhub.io/api/v1/search?q=${encodeURIComponent(i.q)}`,
        {
          signal,
          headers: { "X-Finnhub-Token": apiKey },
        },
      );
      return dedupe(
        (body.result ?? [])
          .filter((r) => r.symbol && (r.type === "Common Stock" || r.type === "ETP" || !r.type))
          .map((r) => ({ symbol: r.symbol!.toUpperCase(), name: r.description ?? "", exchange: "" })),
      );
    },
  };
}

function dedupe(list: StockMatch[]): StockMatch[] {
  const seen = new Set<string>();
  return list
    .filter((m) => /^[A-Z0-9][A-Z0-9.\-]{0,11}$/.test(m.symbol))
    .filter((m) => {
      if (seen.has(m.symbol)) return false;
      seen.add(m.symbol);
      return true;
    })
    .slice(0, 8);
}

// ---------------------------------------------------------------------------
// Demo data (no key configured): deterministic, always labeled "Demo-Daten"
// ---------------------------------------------------------------------------

export const MOCK_STOCKS: StockMatch[] = [
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ" },
  { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ" },
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ" },
  { symbol: "AMZN", name: "Amazon.com, Inc.", exchange: "NASDAQ" },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ" },
  { symbol: "META", name: "Meta Platforms, Inc.", exchange: "NASDAQ" },
  { symbol: "TSLA", name: "Tesla, Inc.", exchange: "NASDAQ" },
  { symbol: "AMD", name: "Advanced Micro Devices", exchange: "NASDAQ" },
  { symbol: "NFLX", name: "Netflix, Inc.", exchange: "NASDAQ" },
  { symbol: "INTC", name: "Intel Corporation", exchange: "NASDAQ" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE" },
  { symbol: "V", name: "Visa Inc.", exchange: "NYSE" },
  { symbol: "KO", name: "The Coca-Cola Company", exchange: "NYSE" },
  { symbol: "DIS", name: "The Walt Disney Company", exchange: "NYSE" },
  { symbol: "SAP", name: "SAP SE", exchange: "NYSE" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", exchange: "NYSE Arca" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", exchange: "NASDAQ" },
];

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Price of the demo stock right now: a stable base plus a slow, deterministic wobble. */
export function mockPrice(symbol: string, now: number): { price: number; base: number } {
  const base = 20 + seeded(symbol) * 480;
  const bucket = Math.floor(now / 120_000);
  return { base, price: r2(base * (1 + (seeded(`${symbol}:${bucket}`) - 0.5) * 0.06)) };
}

export function mockQuote(symbol: string, now: number): StockQuote {
  const { price, base } = mockPrice(symbol, now);
  const change = r2(price - base);
  const swing = base * 0.012;
  return {
    symbol,
    price,
    change,
    changePct: r2((change / base) * 100),
    currency: "USD",
    asOf: new Date(Math.floor(now / 120_000) * 120_000).toISOString(),
    name: MOCK_STOCKS.find((s) => s.symbol === symbol)?.name ?? null,
    open: r2(base * (1 + (seeded(`${symbol}:open`) - 0.5) * 0.01)),
    high: r2(Math.max(price, base) + swing),
    low: r2(Math.min(price, base) - swing),
    prevClose: r2(base),
    week52High: r2(base * 1.28),
    week52Low: r2(base * 0.74),
  };
}

const MOCK_SHAPE: Record<StockRange, { stepSec: number; count: number; vol: number }> = {
  "1T": { stepSec: 300, count: 78, vol: 0.0035 },
  "1W": { stepSec: 3600, count: 35, vol: 0.006 },
  "1M": { stepSec: 86_400, count: 22, vol: 0.014 },
  "1J": { stepSec: 86_400 * 1.45, count: 252, vol: 0.017 },
};

/** Random walk that ends at the current demo price. */
export function mockHistory(symbol: string, range: StockRange, now: number): StockHistory {
  const { stepSec, count, vol } = MOCK_SHAPE[range];
  const endT = Math.floor(now / 1000 / stepSec) * stepSec;
  const points: StockPoint[] = new Array(count);
  let price = mockPrice(symbol, now).price;
  for (let k = count - 1; k >= 0; k--) {
    points[k] = { t: Math.round(endT - (count - 1 - k) * stepSec), c: r2(price) };
    price = price / (1 + (seeded(`${symbol}:${range}:${k}`) - 0.5) * 2 * vol);
  }
  return { symbol, range, currency: "USD", points };
}

export function mockStockQuote(now: () => number = Date.now): Provider<{ symbol: string }, StockQuote> {
  return {
    id: "mock",
    ttlMs: 2 * 60_000,
    maxStaleMs: 24 * 3600_000,
    cacheKey: (i) => `mock-stock:${i.symbol}`,
    fetch: async (i) => mockQuote(i.symbol, now()),
  };
}

export function mockStockHistory(
  now: () => number = Date.now,
): Provider<{ symbol: string; range: StockRange }, StockHistory> {
  return {
    id: "mock",
    ttlMs: 5 * 60_000,
    maxStaleMs: 24 * 3600_000,
    cacheKey: (i) => `mock-history:${i.symbol}:${i.range}`,
    fetch: async (i) => mockHistory(i.symbol, i.range, now()),
  };
}

export function mockStockSearch(): Provider<{ q: string }, StockMatch[]> {
  return {
    id: "mock",
    ttlMs: 3600_000,
    maxStaleMs: 3600_000,
    cacheKey: (i) => `mock-search:${i.q.toLowerCase()}`,
    async fetch(i) {
      const q = i.q.trim().toLowerCase();
      return MOCK_STOCKS.filter((s) => s.symbol.toLowerCase().startsWith(q) || s.name.toLowerCase().includes(q)).slice(
        0,
        8,
      );
    },
  };
}
