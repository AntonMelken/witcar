import type { WidgetBaseMeta } from "../types";
import type { StocksConfig } from "./schema";

export type { StocksConfig } from "./schema";

export const STOCK_SYMBOL_PATTERN = "^[A-Z0-9][A-Z0-9.\\-]{0,11}$";

/** Symbols one stocks widget can watch. */
export const STOCK_MAX_SYMBOLS = 20;

export interface StockQuote {
  symbol: string;
  price: number;
  change: number | null;
  changePct: number | null;
  currency: string | null;
  asOf: string | null;
  /** optional details some providers deliver (shown in the stocks app) */
  name?: string | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  prevClose?: number | null;
  week52High?: number | null;
  week52Low?: number | null;
}

/** Chart ranges of the stocks app: 1 day, 1 week, 1 month, 1 year. */
export const STOCK_RANGES = ["1T", "1W", "1M", "1J"] as const;
export type StockRange = (typeof STOCK_RANGES)[number];

export interface StockPoint {
  /** epoch seconds (UTC) */
  t: number;
  /** close */
  c: number;
}

export interface StockHistory {
  symbol: string;
  range: StockRange;
  currency: string | null;
  points: StockPoint[];
}

export interface StockMatch {
  symbol: string;
  name: string;
  exchange: string;
}

export const stocksMeta: WidgetBaseMeta<StocksConfig> = {
  type: "stocks",
  title: "stocks.title",
  minSize: { w: 3, h: 2 },
  defaultSize: { w: 4, h: 4 },
  defaultConfig: { symbols: ["AAPL"], showChange: true },
  driveSafe: true,
  refreshMs: 2 * 60_000,
  proOnly: false,
  fields: [
    {
      key: "symbols",
      kind: "list",
      label: "stocks.fields.symbols",
      placeholder: "AAPL",
      maxItems: STOCK_MAX_SYMBOLS,
      pattern: STOCK_SYMBOL_PATTERN,
      transform: "upper",
    },
    { key: "showChange", kind: "boolean", label: "stocks.fields.showChange" },
  ],
  // Drive mode shows at most one ticker (masterplan §9.2).
  dataRequests: (config, mode) =>
    (mode === "drive" ? config.symbols.slice(0, 1) : config.symbols).map((symbol) => ({
      kind: "stock" as const,
      params: { symbol },
    })),
  tickerCount: (config) => config.symbols.length,
};
