import type { WidgetBaseMeta } from "../types";
import type { FxConfig } from "./schema";

export type { FxConfig } from "./schema";

export const CURRENCY_PATTERN = "^[A-Z]{3}$";

/** ECB euro reference rates: 1 EUR = rates[CUR]; prev = the business day before. */
export interface FxData {
  date: string;
  rates: Record<string, number>;
  prevDate: string | null;
  prev: Record<string, number> | null;
}

export const fxMeta: WidgetBaseMeta<FxConfig> = {
  type: "fx",
  title: "fx.title",
  minSize: { w: 3, h: 2 },
  defaultSize: { w: 4, h: 4 },
  defaultConfig: { currencies: ["USD", "GBP", "CHF"], showChange: true },
  driveSafe: true,
  // ECB publishes once per business day (~16:00 CET)
  refreshMs: 60 * 60_000,
  staleAfterMs: 130 * 60_000,
  proOnly: false,
  fields: [
    {
      key: "currencies",
      kind: "list",
      label: "fx.fields.currencies",
      placeholder: "USD",
      maxItems: 20,
      pattern: CURRENCY_PATTERN,
      transform: "upper",
    },
    { key: "showChange", kind: "boolean", label: "fx.fields.showChange" },
  ],
  // one shared request for all currencies: the ECB file contains every rate
  dataRequests: () => [{ kind: "fx", params: {} }],
  tickerCount: (config) => config.currencies.length,
};
