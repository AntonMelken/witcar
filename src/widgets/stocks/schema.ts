import { z } from "zod";
import { STOCK_SYMBOL_PATTERN } from "./definition";

export const stocksSchema = z.object({
  symbols: z
    .array(z.string().regex(new RegExp(STOCK_SYMBOL_PATTERN)))
    .min(1)
    .max(20)
    .default(["AAPL"]),
  showChange: z.boolean().default(true),
});
export type StocksConfig = z.infer<typeof stocksSchema>;
