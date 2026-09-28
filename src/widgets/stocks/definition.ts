import type { WidgetBaseMeta } from "../types";
import type { StocksConfig } from "./schema";

export type { StocksConfig } from "./schema";

export const STOCK_SYMBOL_PATTERN = "^[A-Z0-9][A-Z0-9.\\-]{0,11}$";

export interface StockQuote {
  symbol: string;
  price: number;
  change: number | null;
  changePct: number | null;
  currency: string | null;
  asOf: string | null;
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
      maxItems: 20,
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
