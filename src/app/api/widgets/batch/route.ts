import { after } from "next/server";
import { z } from "zod";
import { RULES } from "@/lib/cache/rateLimit";
import { rateLimit } from "@/lib/cache/rateLimit";
import { getKV } from "@/lib/cache";
import { ProviderUnavailableError } from "@/lib/cache/gateway";
import { clientIp, handler, HttpError, ok } from "@/lib/http/route";
import { fetchData } from "@/lib/providers";
import { COIN_ID_PATTERN } from "@/widgets/crypto/definition";
import { STOCK_SYMBOL_PATTERN } from "@/widgets/stocks/definition";
import { dataKey, type DataRequest, type ProviderResult } from "@/widgets/types";

const requestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("weather"),
    params: z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }),
  }),
  z.object({
    kind: z.literal("stock"),
    params: z.object({ symbol: z.string().regex(new RegExp(STOCK_SYMBOL_PATTERN)) }),
  }),
  z.object({
    kind: z.literal("crypto"),
    params: z.object({ id: z.string().regex(new RegExp(COIN_ID_PATTERN)), vs: z.enum(["eur", "usd"]) }),
  }),
  z.object({ kind: z.literal("fx"), params: z.object({}).strict() }),
]);

const bodySchema = z.object({ requests: z.array(requestSchema).min(1).max(40) });

type ResultOrError = ProviderResult | { error: { code: string } };

/**
 * All widget data in ONE request (masterplan §11.4). Every item goes through
 * the shared cache gateway; a failing provider never fails the whole batch.
 */
export const POST = handler({ auth: "optional", body: bodySchema }, async ({ req, body, principal }) => {
  const unique = new Map<string, DataRequest>();
  for (const r of body.requests as DataRequest[]) unique.set(dataKey(r), r);

  // 60 widget requests/min per user/device; anonymous demo traffic is limited per IP
  const rule = principal ? RULES.widgetsUser : RULES.widgetsAnon;
  const id = principal ? `u:${principal.userId}` : `ip:${clientIp(req)}`;
  const rl = await rateLimit(getKV(), rule, id, Date.now(), unique.size);
  if (!rl.ok)
    throw new HttpError(429, "rate_limited", "Too many requests", { "Retry-After": String(rl.retryAfterSec) });

  const entries = await Promise.all(
    [...unique.entries()].map(async ([key, r]): Promise<[string, ResultOrError]> => {
      try {
        return [key, await fetchData(r, (task) => after(task))];
      } catch (err) {
        const code = err instanceof ProviderUnavailableError ? err.reason : "error";
        return [key, { error: { code } }];
      }
    }),
  );
  return ok({ results: Object.fromEntries(entries), serverTime: new Date().toISOString() });
});
