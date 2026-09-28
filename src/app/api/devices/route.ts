import { getDb } from "@/lib/db";
import { handler, ok } from "@/lib/http/route";
import { listDevices } from "@/lib/repo/devices";

export const GET = handler({ auth: "user" }, async ({ principal }) => {
  const db = await getDb();
  return ok({ devices: await listDevices(db, principal.userId) });
});
