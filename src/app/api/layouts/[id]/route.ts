import { RULES } from "@/lib/cache/rateLimit";
import { getDb } from "@/lib/db";
import { layoutSaveSchema } from "@/lib/layout/schema";
import { handler, HttpError, ok, uuidParam } from "@/lib/http/route";
import { deleteLayout, getLayout } from "@/lib/repo/layouts";
import { saveLayoutForUser } from "@/lib/services/layouts";

function layoutId(params: Record<string, string>): string {
  const id = uuidParam.safeParse(params.id);
  if (!id.success) throw new HttpError(400, "invalid_input");
  return id.data;
}

export const GET = handler({ auth: "principal" }, async ({ principal, params }) => {
  const db = await getDb();
  const layout = await getLayout(db, principal.userId, layoutId(params));
  if (!layout) throw new HttpError(404, "not_found");
  return ok({ layout });
});

export const PUT = handler(
  { auth: "principal", body: layoutSaveSchema, rateLimit: { rule: RULES.write, by: "principal" } },
  async ({ principal, params, body }) => {
    const db = await getDb();
    const res = await saveLayoutForUser(db, principal.userId, layoutId(params), body);
    if (!res.ok) throw new HttpError(res.status, res.code, res.widgetId);
    return ok({ layout: res.value });
  },
);

export const DELETE = handler({ auth: "principal" }, async ({ principal, params }) => {
  const db = await getDb();
  if (!(await deleteLayout(db, principal.userId, layoutId(params)))) throw new HttpError(404, "not_found");
  return ok({ ok: true });
});
