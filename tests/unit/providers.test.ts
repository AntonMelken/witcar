import { describe, expect, it, vi } from "vitest";
import { ecbRates, mockFx, parseEcbXml } from "@/lib/providers/fx";
import { coingeckoCrypto, coinmarketcapListings, finnhubStocks, mockCrypto, mockStocks } from "@/lib/providers/markets";
import {
  metDays,
  metNorwayWeather,
  metSymbolToWmo,
  mockWeather,
  nominatimGeocoding,
  openMeteoGeocoding,
  openMeteoWeather,
} from "@/lib/providers/weather";

const jsonFetch = (body: unknown, status = 200) =>
  vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));
const signal = new AbortController().signal;

describe("provider adapters", () => {
  it("open-meteo: parses forecast, uses customer host with api key", async () => {
    const f = jsonFetch({
      current: { temperature_2m: 12.3, weather_code: 61, is_day: 1, wind_speed_10m: 14 },
      daily: {
        time: ["2026-09-29", "2026-09-30"],
        weather_code: [61, 3],
        temperature_2m_max: [15, 17],
        temperature_2m_min: [7, 8],
        precipitation_sum: [4.2, 0],
        precipitation_probability_max: [80, 10],
        wind_speed_10m_max: [22, 15],
      },
    });
    const p = openMeteoWeather("KEY", f);
    const data = await p.fetch({ lat: 52.5201, lon: 13.4049 }, signal);
    expect(data).toEqual({
      tempC: 12.3,
      code: 61,
      isDay: true,
      highC: 15,
      lowC: 7,
      windKmh: 14,
      precipProb: 80,
      days: [
        { date: "2026-09-29", code: 61, highC: 15, lowC: 7, precipMm: 4.2, windKmh: 22 },
        { date: "2026-09-30", code: 3, highC: 17, lowC: 8, precipMm: 0, windKmh: 15 },
      ],
    });
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

  it("met-norway: current step, 24 h high/low, km/h, identifying User-Agent", async () => {
    const step = (time: string, t: number, symbol?: string) => ({
      time,
      data: {
        instant: { details: { air_temperature: t, wind_speed: 5 } },
        ...(symbol ? { next_1_hours: { summary: { symbol_code: symbol } } } : {}),
      },
    });
    const f = jsonFetch({
      properties: {
        timeseries: [
          step("2026-09-29T08:00:00Z", 9, "clearsky_day"),
          step("2026-09-29T09:00:00Z", 11.4, "lightrainshowers_day"),
          step("2026-09-29T15:00:00Z", 16),
          step("2026-09-30T08:00:00Z", 2),
          step("2026-09-30T12:00:00Z", 30),
        ],
      },
    });
    const now = () => Date.parse("2026-09-29T09:20:00Z");
    const p = metNorwayWeather("WitCar/0.1 (+https://witcar.example)", f, now);
    const data = await p.fetch({ lat: 52.52013, lon: 13.40494 }, signal);
    expect(data).toEqual({
      tempC: 11.4,
      code: 80,
      isDay: true,
      highC: 16,
      lowC: 2,
      windKmh: 18,
      precipProb: null,
      days: [
        { date: "2026-09-29", code: 80, highC: 16, lowC: 9, precipMm: null, windKmh: 18 },
        { date: "2026-09-30", code: 3, highC: 30, lowC: 2, precipMm: null, windKmh: 18 },
      ],
    });
    const [url, init] = f.mock.calls[0]!;
    expect(String(url)).toBe("https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=52.52&lon=13.4");
    expect((init!.headers as Record<string, string>)["user-agent"]).toContain("witcar.example");
    expect(p.ttlMs).toBe(30 * 60_000);
    await expect(
      metNorwayWeather("ua", jsonFetch({ properties: {} })).fetch({ lat: 1, lon: 2 }, signal),
    ).rejects.toThrow(/unexpected/);
  });

  it("met-norway: daily summary sums precipitation once and cuts days at solar midnight", () => {
    const hourly = (time: string, t: number, mm: number, symbol: string) => ({
      time,
      data: {
        instant: { details: { air_temperature: t, wind_speed: 10 } },
        next_1_hours: { summary: { symbol_code: symbol }, details: { precipitation_amount: mm } },
      },
    });
    const sixHourly = (time: string, t: number, mm: number, symbol: string) => ({
      time,
      data: {
        instant: { details: { air_temperature: t, wind_speed: 2 } },
        next_6_hours: { summary: { symbol_code: symbol }, details: { precipitation_amount: mm } },
      },
    });
    // lon 150 = UTC+10 solar time: 15:00Z is already the next day locally
    const days = metDays(
      [
        hourly("2026-09-29T02:00:00Z", 10, 0.5, "rain"),
        hourly("2026-09-29T03:00:00Z", 12, 1, "rain"),
        sixHourly("2026-09-29T15:00:00Z", 8, 3, "cloudy"),
      ],
      150,
    );
    expect(days.map((d) => d.date)).toEqual(["2026-09-29", "2026-09-30"]);
    expect(days[0]).toMatchObject({ highC: 12, lowC: 10, precipMm: 1.5, windKmh: 36, code: 63 });
    expect(days[1]).toMatchObject({ highC: 8, lowC: 8, precipMm: 3, windKmh: 7, code: 3 });
    expect(metDays([], 0)).toEqual([]);
    expect(
      metDays(
        Array.from({ length: 10 }, (_, k) =>
          hourly(`2026-10-${String(k + 1).padStart(2, "0")}T12:00:00Z`, k, 0, "fair"),
        ),
        0,
      ),
    ).toHaveLength(7);
  });

  it("mock weather returns a seven day forecast", async () => {
    const data = await mockWeather(() => 1_790_000_000_000).fetch({ lat: 52.52, lon: 13.41 }, signal);
    expect(data.days).toHaveLength(7);
    expect(new Set(data.days!.map((d) => d.date)).size).toBe(7);
  });

  it("met-norway symbols map to WMO codes", () => {
    expect(metSymbolToWmo("clearsky_night")).toEqual({ code: 0, isDay: false });
    expect(metSymbolToWmo("partlycloudy_polartwilight")).toEqual({ code: 2, isDay: true });
    expect(metSymbolToWmo("cloudy").code).toBe(3);
    expect(metSymbolToWmo("fog").code).toBe(45);
    expect(metSymbolToWmo("heavyrain").code).toBe(65);
    expect(metSymbolToWmo("sleetshowers_day").code).toBe(66);
    expect(metSymbolToWmo("lightsnow").code).toBe(71);
    expect(metSymbolToWmo("lightssnowshowersandthunder_day").code).toBe(95);
  });

  it("nominatim: city search with User-Agent, throttle and de-duplicated results", async () => {
    const f = jsonFetch([
      {
        name: "Köln",
        lat: "50.938361",
        lon: "6.959974",
        address: { state: "Nordrhein-Westfalen", country: "Deutschland" },
      },
      {
        name: "Köln",
        lat: "50.9412",
        lon: "6.9582",
        address: { state: "Nordrhein-Westfalen", country: "Deutschland" },
      },
      { lat: "1", lon: "2" },
    ]);
    const throttle = vi.fn(async () => undefined);
    const r = await nominatimGeocoding("ua-test", throttle, f).fetch({ q: "Köln", lang: "de" }, signal);
    expect(r).toEqual([{ name: "Köln", lat: 50.94, lon: 6.96, country: "Deutschland", admin1: "Nordrhein-Westfalen" }]);
    expect(throttle).toHaveBeenCalledOnce();
    const [url, init] = f.mock.calls[0]!;
    expect(String(url)).toContain("https://nominatim.openstreetmap.org/search?");
    expect(String(url)).toContain("accept-language=de");
    expect((init!.headers as Record<string, string>)["user-agent"]).toBe("ua-test");
  });

  it("coinmarketcap: one listing for all coins, key in header", async () => {
    const f = jsonFetch({
      data: [
        {
          slug: "bitcoin",
          quote: { EUR: { price: 58000.5, percent_change_24h: -1.5, last_updated: "2026-09-29T09:00:00.000Z" } },
        },
        { slug: "ethereum", quote: { EUR: { price: 2500, percent_change_24h: null } } },
        { slug: "broken", quote: { EUR: { price: null } } },
      ],
    });
    const p = coinmarketcapListings("CMC", f);
    const all = await p.fetch({ vs: "eur" }, signal);
    expect(all.bitcoin).toEqual({
      id: "bitcoin",
      price: 58000.5,
      change24hPct: -1.5,
      currency: "eur",
      asOf: "2026-09-29T09:00:00.000Z",
    });
    expect(all.ethereum!.change24hPct).toBeNull();
    expect(all.broken).toBeUndefined();
    expect(p.cacheKey({ vs: "eur" })).toBe("crypto-top:eur");
    const [url, init] = f.mock.calls[0]!;
    expect(String(url)).toContain("/v1/cryptocurrency/listings/latest?start=1&limit=250&convert=EUR");
    expect(String(url)).not.toContain("CMC");
    expect((init!.headers as Record<string, string>)["x-cmc_pro_api_key"]).toBe("CMC");
    await expect(coinmarketcapListings("k", jsonFetch({ data: [] })).fetch({ vs: "usd" }, signal)).rejects.toThrow();
  });

  it("ecb: parses the latest two days of the reference-rate XML", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <gesmes:subject>Reference rates</gesmes:subject>
  <Cube>
    <Cube time='2026-09-28'><Cube currency='USD' rate='1.1712'/><Cube currency='JPY' rate='172.50'/></Cube>
    <Cube time="2026-09-25"><Cube currency="USD" rate="1.1688"/></Cube>
    <Cube time='2026-09-24'><Cube currency='USD' rate='1.1500'/></Cube>
  </Cube>
</gesmes:Envelope>`;
    expect(parseEcbXml(xml)).toEqual({
      date: "2026-09-28",
      rates: { USD: 1.1712, JPY: 172.5 },
      prevDate: "2026-09-25",
      prev: { USD: 1.1688 },
    });
    expect(() => parseEcbXml("<html>maintenance</html>")).toThrow(/unexpected/);
    const f = vi.fn(async () => new Response(xml, { status: 200 }));
    expect((await ecbRates(f).fetch({}, signal)).date).toBe("2026-09-28");
    expect(String((f.mock.calls[0] as unknown[])[0])).toContain("eurofxref-hist-90d.xml");
    const now = () => 1_790_000_000_000;
    expect(await mockFx(now).fetch({}, signal)).toEqual(await mockFx(now).fetch({}, signal));
  });
});
