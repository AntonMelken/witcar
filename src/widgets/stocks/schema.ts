import { z } from "zod";
import { STOCK_MAX_SYMBOLS, STOCK_SYMBOL_PATTERN } from "./definition";

export const stocksSchema = z.object({
  symbols: z
    .array(z.string().regex(new RegExp(STOCK_SYMBOL_PATTERN)))
    .min(1)
    .max(STOCK_MAX_SYMBOLS)
    .default(["AAPL"]),
  showChange: z.boolean().default(true),
});
export type StocksConfig = z.infer<typeof stocksSchema>;
