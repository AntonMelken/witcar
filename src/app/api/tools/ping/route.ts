import { RULES } from "@/lib/cache/rateLimit";
import { handler, ok } from "@/lib/http/route";

/** Gate G0 drive test: tiny response with server time and a random number. */
export const GET = handler({ auth: "none", rateLimit: { rule: RULES.ping, by: "ip" } }, async () =>
  ok({ serverTime: new Date().toISOString(), n: Math.floor(Math.random() * 1_000_000) }),
);
