import { z } from "zod";
import { RULES } from "@/lib/cache/rateLimit";
import { ProviderUnavailableError } from "@/lib/cache/gateway";
import { handler, HttpError, ok } from "@/lib/http/route";
import { searchStocks } from "@/lib/providers";

/** Symbol search for the stocks app (server-side proxy, cached 24 h). */
export const GET = handler(
  {
    auth: "optional",
    query: z.object({ q: z.string().trim().min(1).max(40) }),
    rateLimit: { rule: RULES.search, by: "ip" },
  },
  async ({ query }) => {
    try {
      const res = await searchStocks(query.q);
      return ok({ results: res.data, source: res.source });
    } catch (err) {
      if (err instanceof ProviderUnavailableError) throw new HttpError(503, err.reason, "Search unavailable");
      throw err;
    }
  },
);
