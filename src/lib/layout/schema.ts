import { z } from "zod";
import { PLAN_LIMITS, type Plan } from "@/lib/plan";
import { isPresetId } from "@/lib/presets";
import { ACTIVE_WIDGET_TYPES, getWidgetMeta, type ActiveWidgetType } from "@/widgets/registry";
import type { DashboardMode } from "@/widgets/types";
import { DRIVE_MAX_WIDGETS, GRID_COLS, GRID_ROWS, findOverlap, inBounds, readingOrder } from "./grid";

export const MAX_WIDGETS_PER_LAYOUT = 24;

export const layoutWidgetSchema = z.object({
  widgetId: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/),
  type: z.enum(ACTIVE_WIDGET_TYPES as [ActiveWidgetType, ...ActiveWidgetType[]]),
  x: z
    .number()
    .int()
    .min(0)
    .max(GRID_COLS - 1),
  y: z
    .number()
    .int()
    .min(0)
    .max(GRID_ROWS - 1),
  w: z.number().int().min(1).max(GRID_COLS),
  h: z.number().int().min(1).max(GRID_ROWS),
  config: z.record(z.string(), z.unknown()).default({}),
});

export type LayoutWidget = z.infer<typeof layoutWidgetSchema>;

export const layoutModeSchema = z.enum(["standard", "drive"]);

export const layoutSaveSchema = z.object({
  name: z.string().trim().min(1).max(60),
  preset: z.string().refine(isPresetId, "unknown preset"),
  widgets: z.array(layoutWidgetSchema).max(MAX_WIDGETS_PER_LAYOUT),
});
export type LayoutSaveInput = z.infer<typeof layoutSaveSchema>;

export const layoutCreateSchema = layoutSaveSchema.extend({
  mode: layoutModeSchema.default("standard"),
  makeDefault: z.boolean().default(false),
});

export type LayoutErrorCode =
  | "duplicate_widget_id"
  | "unknown_widget"
  | "invalid_config"
  | "too_small"
  | "out_of_bounds"
  | "overlap"
  | "too_many_widgets"
  | "drive_unsafe"
  | "pro_widget"
  | "too_many_tickers";

export type LayoutValidation =
  { ok: true; widgets: LayoutWidget[] } | { ok: false; code: LayoutErrorCode; widgetId?: string };

/**
 * Server-side validation incl. plan limits (masterplan §7, §14, §15).
 * Returns widgets with normalized (schema-parsed) configs.
 */
export function validateLayout(widgets: readonly LayoutWidget[], mode: DashboardMode, plan: Plan): LayoutValidation {
  const limits = PLAN_LIMITS[plan];
  const seen = new Set<string>();
  const normalized: LayoutWidget[] = [];

  for (const w of widgets) {
    if (seen.has(w.widgetId)) return { ok: false, code: "duplicate_widget_id", widgetId: w.widgetId };
    seen.add(w.widgetId);

    const meta = getWidgetMeta(w.type);
    if (!meta) return { ok: false, code: "unknown_widget", widgetId: w.widgetId };
    const parsed = meta.configSchema.safeParse(w.config ?? {});
    if (!parsed.success) return { ok: false, code: "invalid_config", widgetId: w.widgetId };
    const config = parsed.data as Record<string, unknown>;

    if (mode === "standard") {
      if (!inBounds(w)) return { ok: false, code: "out_of_bounds", widgetId: w.widgetId };
      if (w.w < meta.minSize.w || w.h < meta.minSize.h) {
        return { ok: false, code: "too_small", widgetId: w.widgetId };
      }
    }
    if (mode === "drive" && !meta.driveSafe) {
      return { ok: false, code: "drive_unsafe", widgetId: w.widgetId };
    }
    if (meta.proOnly && !limits.proWidgets) {
      return { ok: false, code: "pro_widget", widgetId: w.widgetId };
    }
    if (meta.tickerCount && meta.tickerCount(config) > limits.tickersPerWidget) {
      return { ok: false, code: "too_many_tickers", widgetId: w.widgetId };
    }
    normalized.push({ ...w, config });
  }

  const maxCount = mode === "drive" ? Math.min(DRIVE_MAX_WIDGETS, limits.widgetsPerLayout) : limits.widgetsPerLayout;
  if (normalized.length > maxCount) return { ok: false, code: "too_many_widgets" };

  if (mode === "standard") {
    const clash = findOverlap(normalized);
    if (clash) return { ok: false, code: "overlap", widgetId: clash[1].widgetId };
  }
  return { ok: true, widgets: normalized };
}

export interface RenderWidget extends LayoutWidget {
  /** true when the current plan does not cover this widget (downgrade overhang) */
  locked: boolean;
}

/**
 * Applies plan limits for display without deleting anything (§15.2):
 * widgets beyond the plan limit (reading order) and Pro-only widgets are
 * locked; ticker lists are truncated to the plan limit.
 */
export function applyPlanForDisplay(widgets: readonly LayoutWidget[], plan: Plan, mode: DashboardMode): RenderWidget[] {
  const limits = PLAN_LIMITS[plan];
  const maxCount = mode === "drive" ? Math.min(DRIVE_MAX_WIDGETS, limits.widgetsPerLayout) : limits.widgetsPerLayout;
  let active = 0;
  return readingOrder(widgets).map((w) => {
    const meta = getWidgetMeta(w.type);
    const locked = !meta || (meta.proOnly && !limits.proWidgets) || active >= maxCount;
    if (!locked) active++;
    let config = w.config;
    if (meta && !locked) {
      const parsed = meta.configSchema.safeParse(w.config ?? {});
      config = (parsed.success ? parsed.data : meta.defaultConfig) as Record<string, unknown>;
      for (const key of ["symbols", "coins"]) {
        const list = config[key];
        if (Array.isArray(list) && list.length > limits.tickersPerWidget) {
          config = { ...config, [key]: list.slice(0, limits.tickersPerWidget) };
        }
      }
    }
    return { ...w, config, locked };
  });
}

let idCounter = 0;
export function newWidgetId(type: string): string {
  idCounter = (idCounter + 1) % 1_000_000;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${type}-${Date.now().toString(36)}${rand}${idCounter}`.slice(0, 40);
}
