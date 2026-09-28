import { getDb } from "@/lib/db";
import { handler } from "@/lib/http/route";
import { exportAccount } from "@/lib/repo/misc";

/** Data export (GDPR Art. 15/20) as JSON download. */
export const GET = handler({ auth: "user" }, async ({ principal }) => {
  const db = await getDb();
  const data = await exportAccount(db, principal.userId);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="witcar-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
