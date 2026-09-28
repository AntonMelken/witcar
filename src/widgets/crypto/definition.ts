import type { WidgetBaseMeta } from "../types";
import type { CryptoConfig } from "./schema";

export type { CryptoConfig } from "./schema";

export const COIN_ID_PATTERN = "^[a-z0-9][a-z0-9\\-]{0,39}$";

export interface CryptoQuote {
  id: string;
  price: number;
  change24hPct: number | null;
  currency: "eur" | "usd";
  asOf: string | null;
}

export const cryptoMeta: WidgetBaseMeta<CryptoConfig> = {
  type: "crypto",
  title: "crypto.title",
  minSize: { w: 3, h: 2 },
  defaultSize: { w: 4, h: 4 },
  defaultConfig: { coins: ["bitcoin"], vs: "eur" },
  driveSafe: true,
  refreshMs: 90_000,
  proOnly: false,
  fields: [
    {
      key: "coins",
      kind: "list",
      label: "crypto.fields.coins",
      placeholder: "bitcoin",
      maxItems: 20,
      pattern: COIN_ID_PATTERN,
      transform: "lower",
    },
    {
      key: "vs",
      kind: "select",
      label: "crypto.fields.vs",
      options: [
        { value: "eur", label: "EUR" },
        { value: "usd", label: "USD" },
      ],
    },
  ],
  dataRequests: (config, mode) =>
    (mode === "drive" ? config.coins.slice(0, 1) : config.coins).map((id) => ({
      kind: "crypto" as const,
      params: { id, vs: config.vs },
    })),
  tickerCount: (config) => config.coins.length,
};
