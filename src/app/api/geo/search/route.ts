import { z } from "zod";
import { RULES } from "@/lib/cache/rateLimit";
import { ProviderUnavailableError } from "@/lib/cache/gateway";
import { handler, HttpError, ok } from "@/lib/http/route";
import { searchPlaces } from "@/lib/providers";

/** City search for the weather widget (server-side proxy, cached 7 days). */
export const GET = handler(
  {
    auth: "optional",
    query: z.object({ q: z.string().trim().min(2).max(60) }),
    rateLimit: { rule: RULES.geo, by: "ip" },
  },
  async ({ query }) => {
    try {
      const res = await searchPlaces(query.q, "de");
      return ok({ results: res.data, source: res.source });
    } catch (err) {
      if (err instanceof ProviderUnavailableError) throw new HttpError(503, err.reason, "Search unavailable");
      throw err;
    }
  },
);
