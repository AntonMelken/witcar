import { zoneCity } from "./tz";

export interface CityZone {
  tz: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
}

/** Well-known cities (German names) with their IANA zone, for search and "nearest city" (clock app only). */
export const CITY_ZONES: readonly CityZone[] = [
  { tz: "Europe/Berlin", city: "Berlin", country: "Deutschland", lat: 52.52, lon: 13.41 },
  { tz: "Europe/London", city: "London", country: "Vereinigtes Königreich", lat: 51.51, lon: -0.13 },
  { tz: "Europe/Paris", city: "Paris", country: "Frankreich", lat: 48.86, lon: 2.35 },
  { tz: "Europe/Madrid", city: "Madrid", country: "Spanien", lat: 40.42, lon: -3.7 },
  { tz: "Europe/Rome", city: "Rom", country: "Italien", lat: 41.9, lon: 12.5 },
  { tz: "Europe/Vienna", city: "Wien", country: "Österreich", lat: 48.21, lon: 16.37 },
  { tz: "Europe/Zurich", city: "Zürich", country: "Schweiz", lat: 47.37, lon: 8.54 },
  { tz: "Europe/Amsterdam", city: "Amsterdam", country: "Niederlande", lat: 52.37, lon: 4.9 },
  { tz: "Europe/Brussels", city: "Brüssel", country: "Belgien", lat: 50.85, lon: 4.35 },
  { tz: "Europe/Copenhagen", city: "Kopenhagen", country: "Dänemark", lat: 55.68, lon: 12.57 },
  { tz: "Europe/Stockholm", city: "Stockholm", country: "Schweden", lat: 59.33, lon: 18.07 },
  { tz: "Europe/Oslo", city: "Oslo", country: "Norwegen", lat: 59.91, lon: 10.75 },
  { tz: "Europe/Helsinki", city: "Helsinki", country: "Finnland", lat: 60.17, lon: 24.94 },
  { tz: "Europe/Warsaw", city: "Warschau", country: "Polen", lat: 52.23, lon: 21.01 },
  { tz: "Europe/Prague", city: "Prag", country: "Tschechien", lat: 50.08, lon: 14.44 },
  { tz: "Europe/Budapest", city: "Budapest", country: "Ungarn", lat: 47.5, lon: 19.04 },
  { tz: "Europe/Athens", city: "Athen", country: "Griechenland", lat: 37.98, lon: 23.73 },
  { tz: "Europe/Istanbul", city: "Istanbul", country: "Türkei", lat: 41.01, lon: 28.98 },
  { tz: "Europe/Lisbon", city: "Lissabon", country: "Portugal", lat: 38.72, lon: -9.14 },
  { tz: "Europe/Dublin", city: "Dublin", country: "Irland", lat: 53.35, lon: -6.26 },
  { tz: "Atlantic/Reykjavik", city: "Reykjavik", country: "Island", lat: 64.15, lon: -21.94 },
  { tz: "Europe/Moscow", city: "Moskau", country: "Russland", lat: 55.76, lon: 37.62 },
  { tz: "Europe/Kyiv", city: "Kiew", country: "Ukraine", lat: 50.45, lon: 30.52 },
  { tz: "America/New_York", city: "New York", country: "USA (Ostküste)", lat: 40.71, lon: -74.01 },
  { tz: "America/Chicago", city: "Chicago", country: "USA (Zentral)", lat: 41.88, lon: -87.63 },
  { tz: "America/Denver", city: "Denver", country: "USA (Rocky Mountains)", lat: 39.74, lon: -104.99 },
  { tz: "America/Los_Angeles", city: "Los Angeles", country: "USA (Westküste)", lat: 34.05, lon: -118.24 },
  { tz: "America/Phoenix", city: "Phoenix", country: "USA (Arizona)", lat: 33.45, lon: -112.07 },
  { tz: "America/Anchorage", city: "Anchorage", country: "USA (Alaska)", lat: 61.22, lon: -149.9 },
  { tz: "Pacific/Honolulu", city: "Honolulu", country: "USA (Hawaii)", lat: 21.31, lon: -157.86 },
  { tz: "America/Toronto", city: "Toronto", country: "Kanada", lat: 43.65, lon: -79.38 },
  { tz: "America/Vancouver", city: "Vancouver", country: "Kanada", lat: 49.28, lon: -123.12 },
  { tz: "America/Mexico_City", city: "Mexiko-Stadt", country: "Mexiko", lat: 19.43, lon: -99.13 },
  { tz: "America/Bogota", city: "Bogotá", country: "Kolumbien", lat: 4.71, lon: -74.07 },
  { tz: "America/Lima", city: "Lima", country: "Peru", lat: -12.05, lon: -77.04 },
  { tz: "America/Sao_Paulo", city: "São Paulo", country: "Brasilien", lat: -23.55, lon: -46.63 },
  { tz: "America/Argentina/Buenos_Aires", city: "Buenos Aires", country: "Argentinien", lat: -34.6, lon: -58.38 },
  { tz: "America/Santiago", city: "Santiago de Chile", country: "Chile", lat: -33.45, lon: -70.67 },
  { tz: "Asia/Dubai", city: "Dubai", country: "Vereinigte Arabische Emirate", lat: 25.2, lon: 55.27 },
  { tz: "Asia/Riyadh", city: "Riad", country: "Saudi-Arabien", lat: 24.71, lon: 46.68 },
  { tz: "Asia/Tehran", city: "Teheran", country: "Iran", lat: 35.69, lon: 51.39 },
  { tz: "Asia/Karachi", city: "Karatschi", country: "Pakistan", lat: 24.86, lon: 67.0 },
  { tz: "Asia/Kolkata", city: "Delhi", country: "Indien", lat: 28.61, lon: 77.21 },
  { tz: "Asia/Dhaka", city: "Dhaka", country: "Bangladesch", lat: 23.81, lon: 90.41 },
  { tz: "Asia/Bangkok", city: "Bangkok", country: "Thailand", lat: 13.76, lon: 100.5 },
  { tz: "Asia/Jakarta", city: "Jakarta", country: "Indonesien", lat: -6.21, lon: 106.85 },
  { tz: "Asia/Singapore", city: "Singapur", country: "Singapur", lat: 1.35, lon: 103.82 },
  { tz: "Asia/Hong_Kong", city: "Hongkong", country: "China", lat: 22.32, lon: 114.17 },
  { tz: "Asia/Shanghai", city: "Shanghai", country: "China", lat: 31.23, lon: 121.47 },
  { tz: "Asia/Seoul", city: "Seoul", country: "Südkorea", lat: 37.57, lon: 126.98 },
  { tz: "Asia/Tokyo", city: "Tokio", country: "Japan", lat: 35.68, lon: 139.69 },
  { tz: "Asia/Manila", city: "Manila", country: "Philippinen", lat: 14.6, lon: 120.98 },
  { tz: "Australia/Perth", city: "Perth", country: "Australien", lat: -31.95, lon: 115.86 },
  { tz: "Australia/Sydney", city: "Sydney", country: "Australien", lat: -33.87, lon: 151.21 },
  { tz: "Australia/Melbourne", city: "Melbourne", country: "Australien", lat: -37.81, lon: 144.96 },
  { tz: "Pacific/Auckland", city: "Auckland", country: "Neuseeland", lat: -36.85, lon: 174.76 },
  { tz: "Africa/Cairo", city: "Kairo", country: "Ägypten", lat: 30.04, lon: 31.24 },
  { tz: "Africa/Lagos", city: "Lagos", country: "Nigeria", lat: 6.52, lon: 3.38 },
  { tz: "Africa/Nairobi", city: "Nairobi", country: "Kenia", lat: -1.29, lon: 36.82 },
  { tz: "Africa/Johannesburg", city: "Johannesburg", country: "Südafrika", lat: -26.2, lon: 28.05 },
  { tz: "Africa/Casablanca", city: "Casablanca", country: "Marokko", lat: 33.57, lon: -7.59 },
];

export interface ZoneOption {
  tz: string;
  city: string;
  country: string;
}

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss");

/** Every zone the browser knows (about 400), or [] when it cannot list them. */
export function browserZones(): string[] {
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone");
    return list ?? [];
  } catch {
    return [];
  }
}

/**
 * Zones matching a search text (city, country or zone id, ignoring case and
 * accents). Well-known cities come first; without a text the well-known cities
 * are listed.
 */
export function searchZones(query: string, all: readonly string[] = [], limit = 14): ZoneOption[] {
  const q = fold(query.trim());
  const known = new Set(CITY_ZONES.map((c) => c.tz));
  const options: ZoneOption[] = CITY_ZONES.map((c) => ({ tz: c.tz, city: c.city, country: c.country }));
  if (q) {
    for (const tz of all) if (!known.has(tz) && tz !== "UTC") options.push({ tz, city: zoneCity(tz), country: tz });
  }
  if (!q) return options.slice(0, limit);
  const starts: ZoneOption[] = [];
  const contains: ZoneOption[] = [];
  for (const o of options) {
    const city = fold(o.city);
    if (city.startsWith(q)) starts.push(o);
    else if (city.includes(q) || fold(o.country).includes(q) || fold(o.tz).includes(q)) contains.push(o);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** Great-circle distance in km. */
function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Well-known city closest to a position (for "find my time zone"). */
export function nearestCity(lat: number, lon: number): { city: CityZone; km: number } {
  let best = CITY_ZONES[0]!;
  let bestKm = Infinity;
  for (const c of CITY_ZONES) {
    const km = distanceKm(lat, lon, c.lat, c.lon);
    if (km < bestKm) {
      best = c;
      bestKm = km;
    }
  }
  return { city: best, km: Math.round(bestKm) };
}
