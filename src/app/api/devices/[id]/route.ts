import { getDb } from "@/lib/db";
import { handler, HttpError, ok, uuidParam } from "@/lib/http/route";
import { revokeDevice } from "@/lib/repo/devices";

/** Revocation is effective immediately: every request re-checks revoked_at. */
export const DELETE = handler({ auth: "user" }, async ({ principal, params }) => {
  const id = uuidParam.safeParse(params.id);
  if (!id.success) throw new HttpError(400, "invalid_input");
  const db = await getDb();
  if (!(await revokeDevice(db, principal.userId, id.data))) throw new HttpError(404, "not_found");
  return ok({ ok: true });
});
