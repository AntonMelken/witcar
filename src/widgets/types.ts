import type { ComponentType } from "react";
import type { z } from "zod";

export const WIDGET_TYPES = ["clock", "date", "weather", "stocks", "crypto", "timer", "notes", "calendar"] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

export type DashboardMode = "standard" | "drive";

/** Kinds of server-side data a widget can request through /api/widgets/batch. */
export type DataKind = "weather" | "stock" | "crypto";

export type DataRequest =
  | { kind: "weather"; params: { lat: number; lon: number } }
  | { kind: "stock"; params: { symbol: string } }
  | { kind: "crypto"; params: { id: string; vs: "eur" | "usd" } };

/** Uniform provider result format (masterplan §11.1). */
export interface ProviderResult<T = unknown> {
  data: T;
  fetchedAt: string;
  source: string;
  stale: boolean;
}

export interface DataEntry<T = unknown> {
  result: ProviderResult<T> | null;
  error: string | null;
}

/** Declarative config form fields; the editor renders them generically. */
export type FieldSpec =
  | { key: string; kind: "boolean"; label: string }
  | { key: string; kind: "number"; label: string; min: number; max: number; step?: number }
  | { key: string; kind: "text"; label: string; maxLength: number }
  | { key: string; kind: "textarea"; label: string; maxLength: number }
  | { key: string; kind: "select"; label: string; options: { value: string; label: string }[] }
  | {
      key: string;
      kind: "list";
      label: string;
      placeholder: string;
      maxItems: number;
      pattern: string;
      transform?: "upper" | "lower";
    }
  | { key: string; kind: "location"; label: string };

/** Zod-free metadata: safe to ship in the dashboard bundle (§17 budget). */
export interface WidgetBaseMeta<C = Record<string, unknown>> {
  type: WidgetType;
  /** i18n key below `widgets.<type>` */
  title: string;
  minSize: { w: number; h: number };
  defaultSize: { w: number; h: number };
  defaultConfig: C;
  /** allowed in drive mode */
  driveSafe: boolean;
  /** null = purely local, no network */
  refreshMs: number | null;
  proOnly: boolean;
  fields: FieldSpec[];
  /** server data this widget needs for a given config */
  dataRequests?(config: C, mode: DashboardMode): DataRequest[];
  /** number of tickers/coins this config uses (free plan limit) */
  tickerCount?(config: C): number;
}

/** Base meta + zod config schema (server, editor). */
export interface WidgetMeta<S extends z.ZodType = z.ZodType> extends WidgetBaseMeta<z.infer<S>> {
  configSchema: S;
}

export interface WidgetProps<C = Record<string, unknown>> {
  instanceId: string;
  config: C;
  mode: DashboardMode;
  data: Record<string, DataEntry>;
  size: { w: number; h: number };
}

export type WidgetComponent<C = Record<string, unknown>> = ComponentType<WidgetProps<C>>;

/** Full definition as described in masterplan §9.1 (meta + schema + client component). */
export interface WidgetDefinition<S extends z.ZodType = z.ZodType> extends WidgetMeta<S> {
  Component: WidgetComponent<z.infer<S>>;
}

export function dataKey(req: DataRequest): string {
  switch (req.kind) {
    case "weather":
      return `weather:${req.params.lat.toFixed(2)},${req.params.lon.toFixed(2)}`;
    case "stock":
      return `stock:${req.params.symbol}`;
    case "crypto":
      return `crypto:${req.params.id}:${req.params.vs}`;
  }
}
