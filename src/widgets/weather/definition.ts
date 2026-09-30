import type { DashboardMode, WidgetBaseMeta } from "../types";
import type { WeatherConfig, WeatherLocation } from "./schema";

export type { WeatherConfig, WeatherLocation } from "./schema";

/** Places besides the main one that the widget and the weather app show. */
export const WEATHER_MAX_EXTRA = 5;

/** One day of the forecast; `date` is the local calendar day at the place (YYYY-MM-DD). */
export interface ForecastDay {
  date: string;
  /** WMO weather code */
  code: number;
  highC: number | null;
  lowC: number | null;
  precipMm: number | null;
  windKmh: number | null;
}

export interface WeatherData {
  tempC: number;
  code: number;
  isDay: boolean;
  highC: number | null;
  lowC: number | null;
  windKmh: number | null;
  precipProb: number | null;
  /** next 7 days starting today; missing in data cached before the forecast existed */
  days?: ForecastDay[];
}

/** Main place first, then the extra places (drive mode: main place only). */
export function weatherPlaces(config: WeatherConfig, mode: DashboardMode = "standard"): WeatherLocation[] {
  if (!config.location) return [];
  return mode === "drive" ? [config.location] : [config.location, ...(config.extra ?? [])];
}

export const weatherMeta: WidgetBaseMeta<WeatherConfig> = {
  type: "weather",
  title: "weather.title",
  minSize: { w: 3, h: 2 },
  defaultSize: { w: 4, h: 4 },
  defaultConfig: { location: { name: "Berlin", lat: 52.52, lon: 13.41 }, extra: [], showWeek: true },
  driveSafe: true,
  refreshMs: 10 * 60_000,
  // MET Norway is cached 30 min server-side (Expires), + one poll interval
  staleAfterMs: 40 * 60_000,
  proOnly: false,
  fields: [
    { key: "location", kind: "location", label: "weather.fields.location" },
    { key: "showWeek", kind: "boolean", label: "weather.fields.showWeek" },
    { key: "extra", kind: "hint", label: "weather.fields.extraHint" },
  ],
  dataRequests: (config, mode) =>
    weatherPlaces(config, mode).map((p) => ({ kind: "weather" as const, params: { lat: p.lat, lon: p.lon } })),
};
