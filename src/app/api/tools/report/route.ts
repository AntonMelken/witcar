import { z } from "zod";
import { RULES } from "@/lib/cache/rateLimit";
import { getDb } from "@/lib/db";
import { handler, ok } from "@/lib/http/route";
import { insertIncarReport } from "@/lib/repo/misc";

const tri = z.enum(["yes", "no", "partial", "unknown"]);

const schema = z.object({
  model: z.string().trim().max(60).default(""),
  softwareVersion: z.string().trim().max(40).default(""),
  region: z.string().trim().max(40).default(""),
  buildYear: z.number().int().min(2008).max(2100).nullable().default(null),
  visibleWhileDriving: tri,
  counterKeptRunning: tri,
  networkActive: tri,
  notes: z.string().trim().max(2000).default(""),
  userAgent: z.string().max(400),
  viewport: z.object({ w: z.number().int().min(0).max(10000), h: z.number().int().min(0).max(10000) }),
  devicePixelRatio: z.number().min(0).max(10),
  measurements: z
    .object({
      counter: z.number().int().min(0).max(10_000_000),
      pingsOk: z.number().int().min(0).max(1_000_000),
      pingsFailed: z.number().int().min(0).max(1_000_000),
      avgLatencyMs: z.number().min(0).max(120_000).nullable(),
      visibilityLog: z.array(z.string().max(80)).max(50),
      onlineLog: z.array(z.string().max(80)).max(50),
    })
    .partial()
    .default({}),
});

/** Anonymous in-car test report (gate G0/G1). No personal data is collected. */
export const POST = handler(
  { auth: "none", body: schema, rateLimit: { rule: RULES.report, by: "ip" } },
  async ({ body }) => {
    const db = await getDb();
    const id = await insertIncarReport(db, body);
    return ok({ ok: true, id }, { status: 201 });
  },
);
