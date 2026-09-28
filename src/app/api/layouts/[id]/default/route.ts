import { getDb } from "@/lib/db";
import { handler, HttpError, ok, uuidParam } from "@/lib/http/route";
import { setDefaultLayout } from "@/lib/repo/layouts";

export const POST = handler({ auth: "principal" }, async ({ principal, params }) => {
  const id = uuidParam.safeParse(params.id);
  if (!id.success) throw new HttpError(400, "invalid_input");
  const db = await getDb();
  if (!(await setDefaultLayout(db, principal.userId, id.data))) throw new HttpError(404, "not_found");
  return ok({ ok: true });
});
