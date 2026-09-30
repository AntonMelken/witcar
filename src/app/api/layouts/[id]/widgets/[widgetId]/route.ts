import { z } from "zod";
import { RULES } from "@/lib/cache/rateLimit";
import { getDb } from "@/lib/db";
import { handler, HttpError, ok, uuidParam } from "@/lib/http/route";
import { saveWidgetConfigForUser } from "@/lib/services/layouts";

const bodySchema = z.object({
  config: z.record(z.string(), z.unknown()).refine((c) => JSON.stringify(c).length <= 100_000, "config too large"),
});

/** Saves the config of one widget (from the app inside the widget); works for users and paired devices. */
export const PATCH = handler(
  { auth: "principal", body: bodySchema, rateLimit: { rule: RULES.write, by: "principal" } },
  async ({ principal, params, body }) => {
    const layoutId = uuidParam.safeParse(params.id);
    if (!layoutId.success || !/^[A-Za-z0-9_-]{1,40}$/.test(params.widgetId ?? "")) {
      throw new HttpError(400, "invalid_input");
    }
    const db = await getDb();
    const res = await saveWidgetConfigForUser(db, principal.userId, layoutId.data, params.widgetId!, body.config);
    if (!res.ok) throw new HttpError(res.status, res.code, res.widgetId);
    return ok({ widget: res.value });
  },
);
