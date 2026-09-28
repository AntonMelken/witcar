import { RULES } from "@/lib/cache/rateLimit";
import { getDb } from "@/lib/db";
import { layoutCreateSchema } from "@/lib/layout/schema";
import { handler, HttpError, ok } from "@/lib/http/route";
import { listLayouts } from "@/lib/repo/layouts";
import { createLayoutForUser, layoutEditability } from "@/lib/services/layouts";
import { getUserPlan } from "@/lib/services/plan";

export const GET = handler({ auth: "principal" }, async ({ principal }) => {
  const db = await getDb();
  const layouts = await listLayouts(db, principal.userId);
  const [{ plan }, editable] = await Promise.all([
    getUserPlan(db, principal.userId),
    layoutEditability(db, principal.userId, layouts),
  ]);
  return ok({ layouts, plan, editable });
});

export const POST = handler(
  { auth: "principal", body: layoutCreateSchema, rateLimit: { rule: RULES.write, by: "principal" } },
  async ({ principal, body }) => {
    const db = await getDb();
    const res = await createLayoutForUser(db, principal.userId, body);
    if (!res.ok) throw new HttpError(res.status, res.code, res.widgetId);
    return ok({ layout: res.value }, { status: 201 });
  },
);
