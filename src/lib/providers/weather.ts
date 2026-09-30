import type { ForecastDay, WeatherData } from "@/widgets/weather/definition";
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
    time?: string[];
    weather_code?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    precipitation_sum?: (number | null)[];
    precipitation_probability_max?: (number | null)[];
    wind_speed_10m_max?: (number | null)[];
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
        daily:
          "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
        timezone: "auto",
        forecast_days: "7",
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
        days: (body.daily?.time ?? []).slice(0, 7).map((date, k) => ({
          date,
          code: body.daily?.weather_code?.[k] ?? 3,
          highC: body.daily?.temperature_2m_max?.[k] ?? null,
          lowC: body.daily?.temperature_2m_min?.[k] ?? null,
          precipMm: body.daily?.precipitation_sum?.[k] ?? null,
          windKmh: body.daily?.wind_speed_10m_max?.[k] ?? null,
        })),
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

// ---------------------------------------------------------------------------
// MET Norway (free incl. commercial use, CC BY 4.0 / NLOD, D-007)
// ---------------------------------------------------------------------------

interface MetTimestep {
  time: string;
  data: {
    instant: { details: { air_temperature?: number; wind_speed?: number } };
    next_1_hours?: { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number } };
    next_6_hours?: { summary?: { symbol_code?: string }; details?: { precipitation_amount?: number } };
    next_12_hours?: { summary?: { symbol_code?: string } };
  };
}

interface MetForecast {
  properties?: { timeseries?: MetTimestep[] };
}

/** MET symbol_code (e.g. "lightrainshowers_day") -> WMO weather code used by the widget. */
export function metSymbolToWmo(symbol: string): { code: number; isDay: boolean } {
  const [base = "", variant] = symbol.split("_");
  const isDay = variant !== "night";
  const heavy = base.startsWith("heavy");
  const light = base.startsWith("light");
  const showers = base.includes("showers");
  let code: number;
  if (base.includes("thunder")) code = 95;
  else if (base.includes("snow")) code = showers ? (heavy ? 86 : 85) : heavy ? 75 : light ? 71 : 73;
  else if (base.includes("sleet")) code = heavy ? 67 : 66;
  else if (base.includes("rain")) code = showers ? (heavy ? 82 : light ? 80 : 81) : heavy ? 65 : light ? 61 : 63;
  else if (base === "fog") code = 45;
  else if (base === "clearsky") code = 0;
  else if (base === "fair") code = 1;
  else if (base === "partlycloudy") code = 2;
  else code = 3;
  return { code, isDay };
}

/**
 * Daily summary from the hourly/6-hourly series. Days are cut at local solar
 * midnight (longitude / 15 h) because the API has no time zone; that is off by
 * at most an hour or two from the civil day, which does not change highs/lows.
 * The symbol is the one of the step closest to 13:00 solar time.
 */
export function metDays(series: MetTimestep[], lon: number, count = 7): ForecastDay[] {
  const offsetMs = (lon / 15) * 3600_000;
  type Bucket = { temps: number[]; winds: number[]; precip: number; hasPrecip: boolean; symbol?: string; dist: number };
  const buckets = new Map<string, Bucket>();
  for (const s of series) {
    const ts = Date.parse(s.time);
    if (!Number.isFinite(ts)) continue;
    const local = new Date(ts + offsetMs);
    const date = local.toISOString().slice(0, 10);
    const b = buckets.get(date) ?? { temps: [], winds: [], precip: 0, hasPrecip: false, dist: Infinity };
    const details = s.data.instant.details;
    if (typeof details.air_temperature === "number") b.temps.push(details.air_temperature);
    if (typeof details.wind_speed === "number") b.winds.push(details.wind_speed * 3.6);
    // hourly steps carry next_1_hours, the later 6-hourly steps only next_6_hours: never both -> no double counting
    const mm = s.data.next_1_hours?.details?.precipitation_amount ?? s.data.next_6_hours?.details?.precipitation_amount;
    if (typeof mm === "number") {
      b.precip += mm;
      b.hasPrecip = true;
    }
    const symbol =
      s.data.next_6_hours?.summary?.symbol_code ??
      s.data.next_1_hours?.summary?.symbol_code ??
      s.data.next_12_hours?.summary?.symbol_code;
    const hour = local.getUTCHours() + local.getUTCMinutes() / 60;
    if (symbol && Math.abs(hour - 13) < b.dist) {
      b.symbol = symbol;
      b.dist = Math.abs(hour - 13);
    }
    buckets.set(date, b);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, count)
    .map(([date, b]) => ({
      date,
      code: b.symbol ? metSymbolToWmo(b.symbol).code : 3,
      highC: b.temps.length ? Math.round(Math.max(...b.temps) * 10) / 10 : null,
      lowC: b.temps.length ? Math.round(Math.min(...b.temps) * 10) / 10 : null,
      precipMm: b.hasPrecip ? Math.round(b.precip * 10) / 10 : null,
      windKmh: b.winds.length ? Math.round(Math.max(...b.winds)) : null,
    }));
}

/**
 * MET Norway Locationforecast 2.0 (compact). Terms: identifying User-Agent
 * with contact, max 4 coordinate decimals, respect Expires (~30 min) → TTL 30 min.
 * High/low are taken over the next 24 hours of the forecast.
 */
export function metNorwayWeather(
  userAgent: string,
  fetchImpl: FetchLike = fetch,
  now: () => number = Date.now,
): Provider<WeatherInput, WeatherData> {
  return {
    id: "met-norway",
    ttlMs: 30 * 60_000,
    maxStaleMs: 6 * 3600_000,
    // MET asks clients to respect the Expires header: a manual refresh may only skip part of it
    forceMinAgeMs: 5 * 60_000,
    cacheKey: (i) => `weather:${round2(i.lat)},${round2(i.lon)}`,
    async fetch(i, signal) {
      const params = new URLSearchParams({ lat: String(round2(i.lat)), lon: String(round2(i.lon)) });
      const body = await getJson<MetForecast>(
        fetchImpl,
        `https://api.met.no/weatherapi/locationforecast/2.0/compact?${params}`,
        { signal, headers: { "user-agent": userAgent } },
      );
      const series = body.properties?.timeseries ?? [];
      const t = now();
      // the step whose hour contains "now" (or the first future one)
      const current = series.find((s) => Date.parse(s.time) + 3600_000 > t) ?? series[0];
      const temp = current?.data.instant.details.air_temperature;
      const d = current?.data;
      const symbol = d?.next_1_hours?.summary?.symbol_code ?? d?.next_6_hours?.summary?.symbol_code;
      if (!current || typeof temp !== "number" || !symbol) throw new UpstreamError("met-norway: unexpected payload");
      const day = series
        .filter((s) => {
          const ts = Date.parse(s.time);
          return ts >= Date.parse(current.time) && ts < Date.parse(current.time) + 24 * 3600_000;
        })
        .map((s) => s.data.instant.details.air_temperature)
        .filter((v): v is number => typeof v === "number");
      const wind = current.data.instant.details.wind_speed;
      return {
        tempC: temp,
        ...metSymbolToWmo(symbol),
        highC: day.length ? Math.max(...day) : null,
        lowC: day.length ? Math.min(...day) : null,
        windKmh: typeof wind === "number" ? Math.round(wind * 3.6) : null,
        precipProb: null,
        days: metDays(series, i.lon),
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Nominatim / OpenStreetMap (ODbL). Usage policy: max 1 req/s in total,
// identifying User-Agent, cache results, no autocomplete (we search on submit).
// ---------------------------------------------------------------------------

interface NominatimPlace {
  name?: string;
  lat: string;
  lon: string;
  address?: { state?: string; country?: string };
}

export function nominatimGeocoding(
  userAgent: string,
  /** global 1 req/s throttle shared by all instances (KV based) */
  throttle: () => Promise<void> = async () => undefined,
  fetchImpl: FetchLike = fetch,
): Provider<{ q: string; lang: string }, GeoResult[]> {
  return {
    id: "nominatim",
    ttlMs: 7 * 24 * 3600_000,
    maxStaleMs: 30 * 24 * 3600_000,
    cacheKey: (i) => `geo:${i.lang}:${i.q.toLowerCase()}`,
    async fetch(i, signal) {
      await throttle();
      const params = new URLSearchParams({
        q: i.q,
        format: "jsonv2",
        addressdetails: "1",
        featureType: "city",
        limit: "6",
        "accept-language": i.lang,
      });
      const body = await getJson<NominatimPlace[]>(fetchImpl, `https://nominatim.openstreetmap.org/search?${params}`, {
        signal,
        headers: { "user-agent": userAgent },
      });
      const seen = new Set<string>();
      return body
        .filter((r) => r.name)
        .map((r) => ({
          name: r.name!,
          lat: round2(Number(r.lat)),
          lon: round2(Number(r.lon)),
          country: r.address?.country ?? null,
          admin1: r.address?.state ?? null,
        }))
        .filter((r) => {
          const key = `${r.lat},${r.lon}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
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
        days: Array.from({ length: 7 }, (_, k) => {
          const day = Math.floor(now() / 86_400_000) + k;
          const s = seeded(`${round2(i.lat)},${round2(i.lon)}:d${day}`);
          const high = Math.round(base + 5 + (s - 0.5) * 8);
          return {
            date: new Date(day * 86_400_000).toISOString().slice(0, 10),
            code: codes[Math.floor(s * codes.length)]!,
            highC: high,
            lowC: high - 6 - Math.round(s * 3),
            precipMm: Math.round(s * s * 120) / 10,
            windKmh: Math.round(8 + s * 30),
          };
        }),
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
  { name: "Stuttgart", lat: 48.78, lon: 9.18, country: "Deutschland", admin1: "Baden-Württemberg" },
  { name: "Dresden", lat: 51.05, lon: 13.74, country: "Deutschland", admin1: "Sachsen" },
  { name: "Wien", lat: 48.21, lon: 16.37, country: "Österreich", admin1: "Wien" },
  { name: "Zürich", lat: 47.37, lon: 8.54, country: "Schweiz", admin1: "Zürich" },
  { name: "London", lat: 51.51, lon: -0.13, country: "Vereinigtes Königreich", admin1: "England" },
  { name: "Paris", lat: 48.86, lon: 2.35, country: "Frankreich", admin1: "Île-de-France" },
];

export function mockGeocoding(): Provider<{ q: string; lang: string }, GeoResult[]> {
  return {
    id: "mock",
    ttlMs: 3600_000,
    maxStaleMs: 3600_000,
    cacheKey: (i) => `mock-geo:${i.q.toLowerCase()}`,
    async fetch(i) {
      const q = i.q.toLowerCase().trim();
      return MOCK_CITIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6);
    },
  };
}
