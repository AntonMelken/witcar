import { z } from "zod";
import { WEATHER_MAX_EXTRA } from "./definition";

export const locationSchema = z.object({
  name: z.string().trim().min(1).max(80),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});
export type WeatherLocation = z.infer<typeof locationSchema>;

export const weatherSchema = z.object({
  location: locationSchema.nullable().default(null),
  extra: z.array(locationSchema).max(WEATHER_MAX_EXTRA).default([]),
  /** seven-day strip inside the widget (when the tile is tall enough) */
  showWeek: z.boolean().default(true),
});
export type WeatherConfig = z.infer<typeof weatherSchema>;
