import { lazy, type LazyExoticComponent } from "react";
import type { ActiveWidgetType } from "./meta";
import type { WidgetAppComponent } from "./types";

type LazyApp = LazyExoticComponent<WidgetAppComponent>;

/** Each app is typed with its own config; the host only knows the generic shape (config is validated on the server). */
function app<C>(loader: () => Promise<{ default: WidgetAppComponent<C> }>): LazyApp {
  return lazy(loader as unknown as () => Promise<{ default: WidgetAppComponent }>);
}

/**
 * Widget apps: the full-screen detail view that opens when a widget is tapped.
 * Loaded on demand (own chunk each), so they do not count against the
 * /dashboard initial JS budget. Widgets without an entry are not tappable.
 */
export const widgetApps: Partial<Record<ActiveWidgetType, LazyApp>> = {
  clock: app(() => import("./clock/App")),
  weather: app(() => import("./weather/App")),
  stocks: app(() => import("./stocks/App")),
  timer: app(() => import("./timer/App")),
  notes: app(() => import("./notes/App")),
};

export function hasWidgetApp(type: string): boolean {
  return Object.prototype.hasOwnProperty.call(widgetApps, type);
}
