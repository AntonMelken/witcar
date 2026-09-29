import type { WidgetBaseMeta } from "../types";
import type { WeatherConfig } from "./schema";

export type { WeatherConfig, WeatherLocation } from "./schema";

export interface WeatherData {
  tempC: number;
  code: number;
  isDay: boolean;
  highC: number | null;
  lowC: number | null;
  windKmh: number | null;
  precipProb: number | null;
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
