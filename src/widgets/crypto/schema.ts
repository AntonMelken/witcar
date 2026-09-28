import { z } from "zod";
import { COIN_ID_PATTERN } from "./definition";

export const cryptoSchema = z.object({
  coins: z
    .array(z.string().regex(new RegExp(COIN_ID_PATTERN)))
    .min(1)
    .max(20)
    .default(["bitcoin"]),
  vs: z.enum(["eur", "usd"]).default("eur"),
});
export type CryptoConfig = z.infer<typeof cryptoSchema>;
