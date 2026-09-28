import type { z } from "zod";
import { clockSchema } from "./clock/schema";
import { cryptoSchema } from "./crypto/schema";
import { dateSchema } from "./date/schema";
import { ACTIVE_WIDGET_TYPES, getWidgetBaseMeta, isActiveWidgetType, widgetMetas, type ActiveWidgetType } from "./meta";
import { notesSchema } from "./notes/schema";
import { stocksSchema } from "./stocks/schema";
import { timerSchema } from "./timer/schema";
import type { WidgetMeta } from "./types";
import { weatherSchema } from "./weather/schema";

export { ACTIVE_WIDGET_TYPES, isActiveWidgetType, widgetDataRequests, type ActiveWidgetType } from "./meta";

/**
 * Widget registry = zod-free meta (./meta.ts) + config schemas. Used by API
 * routes (validation) and the editor. Client dashboard code imports ./meta.ts
 * only, to keep zod out of the /dashboard bundle.
 * Adding a widget = folder (definition.ts, schema.ts, Widget.tsx) + entries in
 * meta.ts, registry.ts and components.ts.
 */
export const widgetSchemas: Record<ActiveWidgetType, z.ZodType> = {
  clock: clockSchema,
  date: dateSchema,
  weather: weatherSchema,
  stocks: stocksSchema,
  crypto: cryptoSchema,
  timer: timerSchema,
  notes: notesSchema,
};

export const widgetRegistry = Object.fromEntries(
  ACTIVE_WIDGET_TYPES.map((t) => [t, { ...widgetMetas[t], configSchema: widgetSchemas[t] }]),
) as unknown as Record<ActiveWidgetType, WidgetMeta>;

export function getWidgetMeta(type: string): WidgetMeta | null {
  if (!isActiveWidgetType(type)) return null;
  const base = getWidgetBaseMeta(type)!;
  return { ...base, configSchema: widgetSchemas[type] } as WidgetMeta;
}

/** Parses a stored config; falls back to defaults for invalid/legacy data. */
export function parseWidgetConfig(type: string, config: unknown): Record<string, unknown> {
  const meta = getWidgetMeta(type);
  if (!meta) return {};
  const parsed = meta.configSchema.safeParse(config ?? {});
  return (parsed.success ? parsed.data : meta.defaultConfig) as Record<string, unknown>;
}
