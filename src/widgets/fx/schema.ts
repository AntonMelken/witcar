import { z } from "zod";
import { CURRENCY_PATTERN } from "./definition";

export const fxSchema = z.object({
  currencies: z
    .array(z.string().regex(new RegExp(CURRENCY_PATTERN)))
    .min(1)
    .max(20)
    .default(["USD", "GBP", "CHF"]),
  showChange: z.boolean().default(true),
});
export type FxConfig = z.infer<typeof fxSchema>;
