import type { FxData } from "@/widgets/fx/definition";
import { seeded, UpstreamError, type FetchLike, type Provider } from "./types";

const DAY = /<Cube\s+time=["'](\d{4}-\d{2}-\d{2})["']\s*>([\s\S]*?)<\/Cube>/g;
const RATE = /<Cube\s+currency=["']([A-Z]{3})["']\s+rate=["']([\d.]+)["']\s*\/>/g;

/** Parses the ECB eurofxref XML (newest day first); returns the latest two days. */
export function parseEcbXml(xml: string): FxData {
  const days: { date: string; rates: Record<string, number> }[] = [];
  for (const m of xml.matchAll(DAY)) {
    const rates: Record<string, number> = {};
    for (const r of m[2]!.matchAll(RATE)) rates[r[1]!] = Number(r[2]);
    if (Object.keys(rates).length) days.push({ date: m[1]!, rates });
    if (days.length === 2) break;
  }
  const [latest, previous] = days;
  if (!latest) throw new UpstreamError("ecb: unexpected payload");
  return { date: latest.date, rates: latest.rates, prevDate: previous?.date ?? null, prev: previous?.rates ?? null };
}

/**
 * ECB euro foreign exchange reference rates. Free reuse incl. commercial use
 * with the ECB named as source (D-031). Published once per business day, so
 * one call per hour for all users is plenty.
 */
export function ecbRates(fetchImpl: FetchLike = fetch): Provider<Record<string, never>, FxData> {
  return {
    id: "ecb",
    ttlMs: 60 * 60_000,
    maxStaleMs: 5 * 24 * 3600_000,
    cacheKey: () => "fx:ecb",
    async fetch(_i, signal) {
      const res = await fetchImpl("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml", {
        signal,
        headers: { accept: "application/xml,text/xml" },
      });
      if (!res.ok) throw new UpstreamError(`upstream ${res.status}`, res.status);
      return parseEcbXml(await res.text());
    },
  };
}

const MOCK_BASE: Record<string, number> = { USD: 1.17, GBP: 0.86, CHF: 0.94, JPY: 172.5, PLN: 4.26, SEK: 11.02 };

/** Deterministic demo rates; clearly labeled as "mock". */
export function mockFx(now: () => number = Date.now): Provider<Record<string, never>, FxData> {
  return {
    id: "mock",
    ttlMs: 60 * 60_000,
    maxStaleMs: 5 * 24 * 3600_000,
    cacheKey: () => "mock-fx",
    async fetch() {
      const day = Math.floor(now() / 86_400_000);
      const at = (d: number) =>
        Object.fromEntries(
          Object.entries(MOCK_BASE).map(([c, v]) => [
            c,
            Math.round(v * (1 + (seeded(`${c}:${d}`) - 0.5) * 0.02) * 1e4) / 1e4,
          ]),
        );
      const iso = (d: number) => new Date(d * 86_400_000).toISOString().slice(0, 10);
      return { date: iso(day), rates: at(day), prevDate: iso(day - 1), prev: at(day - 1) };
    },
  };
}
