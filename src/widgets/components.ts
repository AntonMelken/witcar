import { lazy, type LazyExoticComponent } from "react";
import type { ActiveWidgetType } from "./meta";
import type { WidgetComponent } from "./types";

type LazyWidget = LazyExoticComponent<WidgetComponent<never>>;

/**
 * Client-side component map; keep in sync with registry.ts. Every widget is
 * its own chunk, so a dashboard only downloads the widget types it shows
 * (/dashboard initial JS budget, §17).
 */
export const widgetComponents: Record<ActiveWidgetType, LazyWidget> = {
  clock: lazy(() => import("./clock/Widget")),
  date: lazy(() => import("./date/Widget")),
  weather: lazy(() => import("./weather/Widget")),
  stocks: lazy(() => import("./stocks/Widget")),
  crypto: lazy(() => import("./crypto/Widget")),
  fx: lazy(() => import("./fx/Widget")),
  timer: lazy(() => import("./timer/Widget")),
  notes: lazy(() => import("./notes/Widget")),
};
