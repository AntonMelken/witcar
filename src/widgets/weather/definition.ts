import type { WidgetBaseMeta } from "../types";
import type { WeatherConfig } from "./schema";

export type { WeatherConfig, WeatherLocation } from "./schema";

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

export const weatherMeta: WidgetBaseMeta<WeatherConfig> = {
  type: "weather",
  title: "weather.title",
  minSize: { w: 3, h: 2 },
  defaultSize: { w: 4, h: 4 },
  defaultConfig: { location: { name: "Berlin", lat: 52.52, lon: 13.41 } },
  driveSafe: true,
  refreshMs: 10 * 60_000,
  // MET Norway is cached 30 min server-side (Expires), + one poll interval
  staleAfterMs: 40 * 60_000,
  proOnly: false,
  fields: [{ key: "location", kind: "location", label: "weather.fields.location" }],
  dataRequests: (config) =>
    config.location ? [{ kind: "weather", params: { lat: config.location.lat, lon: config.location.lon } }] : [],
};
