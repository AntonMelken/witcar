import type { Db } from "@/lib/db/types";
import { arrangeForDrive } from "@/lib/layout/grid";
import { validateLayout, type LayoutErrorCode, type LayoutWidget } from "@/lib/layout/schema";
import { PLAN_LIMITS } from "@/lib/plan";
import * as repo from "@/lib/repo/layouts";
import type { DashboardMode } from "@/widgets/types";
import { getUserPlan } from "./plan";

export type ServiceResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      status: number;
      code: LayoutErrorCode | "not_found" | "layout_limit" | "read_only";
      widgetId?: string;
    };

/**
 * On Free, only the oldest standard layout is editable; others become
 * read-only after a downgrade (no data loss, masterplan §15.2).
 */
async function isEditable(db: Db, userId: string, layout: repo.Layout, plan: "free" | "pro"): Promise<boolean> {
  if (plan === "pro" || layout.mode === "drive") return true;
  const oldest = await repo.getOldestLayoutId(db, userId, "standard");
  return oldest === layout.id;
}

function prepareWidgets(widgets: readonly LayoutWidget[], mode: DashboardMode): LayoutWidget[] {
  return mode === "drive" ? arrangeForDrive(widgets) : [...widgets];
}

export async function createLayoutForUser(
  db: Db,
  userId: string,
  input: { name: string; preset: string; mode: DashboardMode; widgets: LayoutWidget[]; makeDefault: boolean },
): Promise<ServiceResult<repo.Layout>> {
  const { plan } = await getUserPlan(db, userId);
  if (input.mode === "standard") {
    const count = await repo.countLayouts(db, userId, "standard");
    if (count >= PLAN_LIMITS[plan].standardLayouts) return { ok: false, status: 403, code: "layout_limit" };
  } else if ((await repo.countLayouts(db, userId, "drive")) >= 1) {
    // one drive layout per user; it is edited in place
    return { ok: false, status: 409, code: "layout_limit" };
  }
  const v = validateLayout(input.widgets, input.mode, plan);
  if (!v.ok) return { ok: false, status: 422, code: v.code, widgetId: v.widgetId };
  const layout = await repo.createLayout(db, userId, { ...input, widgets: prepareWidgets(v.widgets, input.mode) });
  return { ok: true, value: layout };
}

export async function saveLayoutForUser(
  db: Db,
  userId: string,
  id: string,
  input: { name: string; preset: string; widgets: LayoutWidget[] },
): Promise<ServiceResult<repo.Layout>> {
  const existing = await repo.getLayout(db, userId, id);
  if (!existing) return { ok: false, status: 404, code: "not_found" };
  const { plan } = await getUserPlan(db, userId);
  if (!(await isEditable(db, userId, existing, plan))) return { ok: false, status: 403, code: "read_only" };
  const v = validateLayout(input.widgets, existing.mode, plan);
  if (!v.ok) return { ok: false, status: 422, code: v.code, widgetId: v.widgetId };
  const saved = await repo.saveLayout(db, userId, id, { ...input, widgets: prepareWidgets(v.widgets, existing.mode) });
  return saved ? { ok: true, value: saved } : { ok: false, status: 404, code: "not_found" };
}

export async function duplicateLayoutForUser(db: Db, userId: string, id: string, name: string) {
  const source = await repo.getLayout(db, userId, id);
  if (!source) return { ok: false as const, status: 404, code: "not_found" as const };
  return createLayoutForUser(db, userId, {
    name,
    preset: source.preset,
    mode: source.mode,
    widgets: source.widgets,
    makeDefault: false,
  });
}

export async function layoutEditability(db: Db, userId: string, layouts: repo.LayoutSummary[]) {
  const { plan } = await getUserPlan(db, userId);
  const oldest = await repo.getOldestLayoutId(db, userId, "standard");
  return Object.fromEntries(
    layouts.map((l) => [l.id, plan === "pro" || l.mode === "drive" || l.id === oldest]),
  ) as Record<string, boolean>;
}
