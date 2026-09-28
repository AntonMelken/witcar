import type { WeatherData } from "@/widgets/weather/definition";
import { getJson, seeded, UpstreamError, type FetchLike, type Provider } from "./types";

export interface WeatherInput {
  lat: number;
  lon: number;
}

export interface GeoResult {
  name: string;
  lat: number;
  lon: number;
  country: string | null;
  admin1: string | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

interface OpenMeteoForecast {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    is_day?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: (number | null)[];
  };
}

/**
 * Open-Meteo forecast API. The free host is non-commercial only; with
 * WEATHER_API_KEY the commercial customer host is used (D-007, gate G2).
 */
export function openMeteoWeather(
  apiKey: string | undefined,
  fetchImpl: FetchLike = fetch,
): Provider<WeatherInput, WeatherData> {
  const host = apiKey ? "https://customer-api.open-meteo.com" : "https://api.open-meteo.com";
  return {
    id: "open-meteo",
    ttlMs: 10 * 60_000,
    maxStaleMs: 6 * 3600_000,
    cacheKey: (i) => `weather:${round2(i.lat)},${round2(i.lon)}`,
    async fetch(i, signal) {
      const params = new URLSearchParams({
        latitude: String(round2(i.lat)),
        longitude: String(round2(i.lon)),
        current: "temperature_2m,weather_code,is_day,wind_speed_10m",
        daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
        timezone: "auto",
        forecast_days: "1",
      });
      if (apiKey) params.set("apikey", apiKey);
      const body = await getJson<OpenMeteoForecast>(fetchImpl, `${host}/v1/forecast?${params}`, { signal });
      const c = body.current;
      if (!c || typeof c.temperature_2m !== "number" || typeof c.weather_code !== "number") {
        throw new UpstreamError("open-meteo: unexpected payload");
      }
      return {
        tempC: c.temperature_2m,
        code: c.weather_code,
        isDay: c.is_day !== 0,
        highC: body.daily?.temperature_2m_max?.[0] ?? null,
        lowC: body.daily?.temperature_2m_min?.[0] ?? null,
        windKmh: c.wind_speed_10m ?? null,
        precipProb: body.daily?.precipitation_probability_max?.[0] ?? null,
      };
    },
  };
}

interface OpenMeteoGeo {
  results?: {
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
  }[];
}

export function openMeteoGeocoding(
  apiKey: string | undefined,
  fetchImpl: FetchLike = fetch,
): Provider<{ q: string; lang: string }, GeoResult[]> {
  const host = apiKey ? "https://customer-geocoding-api.open-meteo.com" : "https://geocoding-api.open-meteo.com";
  return {
    id: "open-meteo-geo",
    ttlMs: 7 * 24 * 3600_000,
    maxStaleMs: 30 * 24 * 3600_000,
    cacheKey: (i) => `geo:${i.lang}:${i.q.toLowerCase()}`,
    async fetch(i, signal) {
      const params = new URLSearchParams({ name: i.q, count: "6", language: i.lang, format: "json" });
      if (apiKey) params.set("apikey", apiKey);
      const body = await getJson<OpenMeteoGeo>(fetchImpl, `${host}/v1/search?${params}`, { signal });
      return (body.results ?? []).map((r) => ({
        name: r.name,
        lat: round2(r.latitude),
        lon: round2(r.longitude),
        country: r.country ?? null,
        admin1: r.admin1 ?? null,
      }));
    },
  };
}

/** Deterministic demo data; changes slowly over time. Clearly labeled as "mock". */
export function mockWeather(now: () => number = Date.now): Provider<WeatherInput, WeatherData> {
  return {
    id: "mock",
    ttlMs: 10 * 60_000,
    maxStaleMs: 6 * 3600_000,
    cacheKey: (i) => `mock-weather:${round2(i.lat)},${round2(i.lon)}`,
    async fetch(i) {
      const hour = Math.floor(now() / 3600_000);
      const r = seeded(`${round2(i.lat)},${round2(i.lon)}:${hour}`);
      const base = 8 + seeded(`${round2(i.lat)}`) * 14;
      const codes = [0, 1, 2, 3, 45, 61, 63, 71, 80, 95];
      return {
        tempC: Math.round((base + r * 6 - 3) * 10) / 10,
        code: codes[Math.floor(r * codes.length)]!,
        isDay: new Date(now()).getUTCHours() >= 5 && new Date(now()).getUTCHours() < 19,
        highC: Math.round(base + 5),
        lowC: Math.round(base - 4),
        windKmh: Math.round(r * 30),
        precipProb: Math.round(r * 100),
      };
    },
  };
}

const MOCK_CITIES: GeoResult[] = [
  { name: "Berlin", lat: 52.52, lon: 13.41, country: "Deutschland", admin1: "Berlin" },
  { name: "Hamburg", lat: 53.55, lon: 10.0, country: "Deutschland", admin1: "Hamburg" },
  { name: "München", lat: 48.14, lon: 11.58, country: "Deutschland", admin1: "Bayern" },
  { name: "Köln", lat: 50.94, lon: 6.96, country: "Deutschland", admin1: "Nordrhein-Westfalen" },
  { name: "Frankfurt am Main", lat: 50.11, lon: 8.68, country: "Deutschland", admin1: "Hessen" },
];

export function mockGeocoding(): Provider<{ q: string; lang: string }, GeoResult[]> {
  return {
    id: "mock",
    ttlMs: 3600_000,
    maxStaleMs: 3600_000,
    cacheKey: (i) => `mock-geo:${i.q.toLowerCase()}`,
    async fetch(i) {
      const q = i.q.toLowerCase();
      return MOCK_CITIES.filter((c) => c.name.toLowerCase().startsWith(q.slice(0, 3)));
    },
  };
}
