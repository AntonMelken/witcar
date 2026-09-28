import { describe, expect, it, vi } from "vitest";
import { coingeckoCrypto, finnhubStocks, mockCrypto, mockStocks } from "@/lib/providers/markets";
import { mockWeather, openMeteoGeocoding, openMeteoWeather } from "@/lib/providers/weather";

const jsonFetch = (body: unknown, status = 200) =>
  vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));
const signal = new AbortController().signal;

describe("provider adapters", () => {
  it("open-meteo: parses forecast, uses customer host with api key", async () => {
    const f = jsonFetch({
      current: { temperature_2m: 12.3, weather_code: 61, is_day: 1, wind_speed_10m: 14 },
      daily: { temperature_2m_max: [15], temperature_2m_min: [7], precipitation_probability_max: [80] },
    });
    const p = openMeteoWeather("KEY", f);
    const data = await p.fetch({ lat: 52.5201, lon: 13.4049 }, signal);
    expect(data).toEqual({ tempC: 12.3, code: 61, isDay: true, highC: 15, lowC: 7, windKmh: 14, precipProb: 80 });
    const url = String(f.mock.calls[0]![0]);
    expect(url).toContain("https://customer-api.open-meteo.com/v1/forecast");
    expect(url).toContain("apikey=KEY");
    expect(url).toContain("latitude=52.52");
    expect(p.cacheKey({ lat: 52.5201, lon: 13.4049 })).toBe("weather:52.52,13.4");
  });

  it("open-meteo: free host without key, rejects bad payloads and http errors", async () => {
    const f = jsonFetch({});
    await expect(openMeteoWeather(undefined, f).fetch({ lat: 1, lon: 2 }, signal)).rejects.toThrow(/unexpected/);
    expect(String(f.mock.calls[0]![0])).toContain("https://api.open-meteo.com/");
    await expect(openMeteoWeather(undefined, jsonFetch({}, 500)).fetch({ lat: 1, lon: 2 }, signal)).rejects.toThrow(
      /500/,
    );
  });

  it("open-meteo geocoding maps results", async () => {
    const f = jsonFetch({
      results: [{ name: "Köln", latitude: 50.93333, longitude: 6.95, country: "Deutschland", admin1: "NRW" }],
    });
    const r = await openMeteoGeocoding(undefined, f).fetch({ q: "Köln", lang: "de" }, signal);
    expect(r).toEqual([{ name: "Köln", lat: 50.93, lon: 6.95, country: "Deutschland", admin1: "NRW" }]);
  });

  it("finnhub: parses quote, token in header (not URL), rejects unknown symbols", async () => {
    const f = jsonFetch({ c: 231.4, d: 2.8, dp: 1.22, h: 0, l: 0, o: 0, pc: 228.6, t: 1790000000 });
    const q = await finnhubStocks("TOKEN", f).fetch({ symbol: "AAPL" }, signal);
    expect(q).toMatchObject({ symbol: "AAPL", price: 231.4, change: 2.8, changePct: 1.22 });
    expect(String(f.mock.calls[0]![0])).not.toContain("TOKEN");
    expect((f.mock.calls[0]![1]!.headers as Record<string, string>)["X-Finnhub-Token"]).toBe("TOKEN");
    await expect(
      finnhubStocks("T", jsonFetch({ c: 0, d: null, dp: null, pc: 0, t: 0 })).fetch({ symbol: "ZZZ" }, signal),
    ).rejects.toThrow(/unknown/);
  });

  it("coingecko: parses simple/price with demo header", async () => {
    const f = jsonFetch({ bitcoin: { eur: 58000.5, eur_24h_change: -1.5, last_updated_at: 1790000000 } });
    const q = await coingeckoCrypto("CG", "demo", f).fetch({ id: "bitcoin", vs: "eur" }, signal);
    expect(q).toEqual({
      id: "bitcoin",
      price: 58000.5,
      change24hPct: -1.5,
      currency: "eur",
      asOf: new Date(1790000000 * 1000).toISOString(),
    });
    expect(String(f.mock.calls[0]![0])).toContain("https://api.coingecko.com/api/v3/simple/price");
    expect((f.mock.calls[0]![1]!.headers as Record<string, string>)["x-cg-demo-api-key"]).toBe("CG");
    await expect(
      coingeckoCrypto(undefined, "demo", jsonFetch({})).fetch({ id: "nope", vs: "eur" }, signal),
    ).rejects.toThrow();
  });

  it("mock providers are deterministic", async () => {
    const now = () => 1_790_000_000_000;
    expect(await mockStocks(now).fetch({ symbol: "AAPL" }, signal)).toEqual(
      await mockStocks(now).fetch({ symbol: "AAPL" }, signal),
    );
    expect((await mockCrypto(now).fetch({ id: "bitcoin", vs: "eur" }, signal)).currency).toBe("eur");
    expect(typeof (await mockWeather(now).fetch({ lat: 52.52, lon: 13.41 }, signal)).tempC).toBe("number");
  });
});
