import { getDb } from "@/lib/db";
import { errorResponse, ok } from "@/lib/http/route";

/** Uptime check endpoint (no personal data). */
export async function GET() {
  try {
    const db = await getDb();
    await db.query("select 1");
    return ok({ ok: true, db: "ok", build: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev" });
  } catch {
    return errorResponse(503, "db_unavailable");
  }
}
