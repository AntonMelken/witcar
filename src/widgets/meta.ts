import { clockMeta } from "./clock/definition";
import { cryptoMeta } from "./crypto/definition";
import { dateMeta } from "./date/definition";
import { notesMeta } from "./notes/definition";
import { stocksMeta } from "./stocks/definition";
import { timerMeta } from "./timer/definition";
import type { DashboardMode, DataRequest, WidgetBaseMeta, WidgetType } from "./types";
import { weatherMeta } from "./weather/definition";

/**
 * Zod-free widget metadata for the dashboard bundle. The full registry with
 * config schemas lives in ./registry.ts (server, editor).
 * `calendar` is reserved in WidgetType but not enabled yet (Phase 5, D-015).
 */
export const widgetMetas = {
  clock: clockMeta,
  date: dateMeta,
  weather: weatherMeta,
  stocks: stocksMeta,
  crypto: cryptoMeta,
  timer: timerMeta,
  notes: notesMeta,
} as const satisfies Partial<Record<WidgetType, { type: WidgetType; driveSafe: boolean }>>;

export type ActiveWidgetType = keyof typeof widgetMetas;

export const ACTIVE_WIDGET_TYPES = Object.keys(widgetMetas) as ActiveWidgetType[];

export function isActiveWidgetType(type: string): type is ActiveWidgetType {
  return Object.prototype.hasOwnProperty.call(widgetMetas, type);
}

export function getWidgetBaseMeta(type: string): WidgetBaseMeta | null {
  return isActiveWidgetType(type) ? (widgetMetas[type] as unknown as WidgetBaseMeta) : null;
}

export function widgetDataRequests(type: string, config: Record<string, unknown>, mode: DashboardMode): DataRequest[] {
  const meta = getWidgetBaseMeta(type);
  if (!meta?.dataRequests) return [];
  return meta.dataRequests(config, mode);
}
