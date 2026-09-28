import { z } from "zod";
import { getDb } from "@/lib/db";
import { handler, HttpError, ok, uuidParam } from "@/lib/http/route";
import { duplicateLayoutForUser } from "@/lib/services/layouts";

export const POST = handler(
  { auth: "principal", body: z.object({ name: z.string().trim().min(1).max(60) }) },
  async ({ principal, params, body }) => {
    const id = uuidParam.safeParse(params.id);
    if (!id.success) throw new HttpError(400, "invalid_input");
    const db = await getDb();
    const res = await duplicateLayoutForUser(db, principal.userId, id.data, body.name);
    if (!res.ok) throw new HttpError(res.status, res.code);
    return ok({ layout: res.value }, { status: 201 });
  },
);
