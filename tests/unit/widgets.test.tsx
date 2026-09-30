// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/de.json";
import { LiteIntlProvider } from "@/i18n/lite";
import { WidgetCell } from "@/components/dashboard/WidgetCell";
import type { RenderWidget } from "@/lib/layout/schema";
import { dataKey, type DataEntry } from "@/widgets/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const wrap = (ui: ReactNode) => render(<LiteIntlProvider messages={messages}>{ui}</LiteIntlProvider>);

afterEach(cleanup);

const stock: RenderWidget = {
  widgetId: "s",
  type: "stocks",
  x: 0,
  y: 0,
  w: 4,
  h: 4,
  config: { symbols: ["AAPL"], showChange: true },
  locked: false,
};
const key = dataKey({ kind: "stock", params: { symbol: "AAPL" } });
const quote = (fetchedAt: string, stale = false): DataEntry => ({
  result: {
    data: { symbol: "AAPL", price: 231.4, change: 2.8, changePct: 1.22, currency: "USD", asOf: null },
    fetchedAt,
    source: "finnhub",
    stale,
  },
  error: null,
});

describe("widget states", () => {
  it("loading", async () => {
    wrap(<WidgetCell widget={stock} mode="standard" entries={{}} />);
    expect(await screen.findByText("Lädt …")).toBeTruthy();
  });

  it("ok: price, arrow + sign, delayed-quote disclaimer", async () => {
    wrap(<WidgetCell widget={stock} mode="standard" entries={{ [key]: quote(new Date().toISOString()) }} />);
    expect(await screen.findByText(/231,40/)).toBeTruthy();
    expect(await screen.findByText(/\+1,22 %/)).toBeTruthy();
    expect(await screen.findByText("▲")).toBeTruthy();
    expect(await screen.findByText(/Kurse verzögert, keine Anlageberatung/)).toBeTruthy();
    expect(document.querySelector("[data-stale]")).toBeNull();
  });

  it("stale: shows last data plus an age marker", async () => {
    const old = new Date(Date.now() - 30 * 60_000).toISOString();
    wrap(<WidgetCell widget={stock} mode="standard" entries={{ [key]: quote(old, true) }} />);
    expect(await screen.findByText(/231,40/)).toBeTruthy();
    expect(document.querySelector("[data-stale]")?.textContent).toMatch(/30 Min/);
  });

  it("error without data", async () => {
    wrap(<WidgetCell widget={stock} mode="standard" entries={{ [key]: { result: null, error: "upstream_error" } }} />);
    expect(await screen.findByText("Kurs nicht verfügbar")).toBeTruthy();
  });

  it("empty: weather without location, notes without text", async () => {
    wrap(
      <>
        <WidgetCell
          widget={{ ...stock, widgetId: "w", type: "weather", config: { location: null, extra: [], showWeek: true } }}
          mode="standard"
          entries={{}}
        />
        <WidgetCell
          widget={{ ...stock, widgetId: "n", type: "notes", config: { notes: [], activeId: null } }}
          mode="standard"
          entries={{}}
        />
      </>,
    );
    expect(await screen.findByText("Kein Ort gewählt")).toBeTruthy();
    expect(await screen.findByText("Leere Notiz")).toBeTruthy();
  });

  it("locked widgets show an upgrade hint instead of content", async () => {
    wrap(<WidgetCell widget={{ ...stock, locked: true }} mode="standard" entries={{}} />);
    expect(await screen.findByText("Mit Pro verfügbar")).toBeTruthy();
  });

  it("a crashing widget is isolated by its error boundary", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    wrap(
      <>
        <WidgetCell
          widget={{
            ...stock,
            widgetId: "bad",
            type: "weather",
            config: { location: { name: "X" }, extra: [], showWeek: true },
          }}
          mode="standard"
          entries={{}}
        />
        <WidgetCell
          widget={{
            ...stock,
            widgetId: "ok",
            type: "notes",
            config: { notes: [{ id: "n1", title: "", text: "still here" }], activeId: "n1" },
          }}
          mode="standard"
          entries={{}}
        />
      </>,
    );
    expect(await screen.findByText("still here")).toBeTruthy();
  });
});

describe("drive mode rendering", () => {
  it("timer and notes are display-only (no inputs, no buttons)", async () => {
    const { container } = wrap(
      <>
        <WidgetCell
          widget={{ ...stock, widgetId: "t", type: "timer", config: { durationSec: 600, label: "" } }}
          mode="drive"
          entries={{}}
        />
        <WidgetCell
          widget={{
            ...stock,
            widgetId: "n",
            type: "notes",
            config: { notes: [{ id: "n1", title: "", text: "x".repeat(200) }], activeId: "n1" },
          }}
          mode="drive"
          entries={{}}
        />
      </>,
    );
    expect(await screen.findByText("10 min")).toBeTruthy();
    expect(container.textContent).toContain("…");
    expect(container.querySelectorAll("button, input, select, textarea")).toHaveLength(0);
  });

  it("stocks show a single ticker and a >= 64px main value", async () => {
    const multi = { ...stock, config: { symbols: ["AAPL", "MSFT"], showChange: true } };
    const { container } = wrap(
      <WidgetCell widget={multi} mode="drive" entries={{ [key]: quote(new Date().toISOString()) }} />,
    );
    expect(await screen.findByText(/231,40/)).toBeTruthy();
    expect(container.textContent).not.toContain("MSFT");
    const big = container.querySelector<HTMLElement>("[data-bignumber]")!;
    expect(big.style.fontSize).toContain("max(64px");
  });
});

describe("data-source credits (provider terms)", () => {
  const weather: RenderWidget = {
    ...stock,
    widgetId: "w",
    type: "weather",
    config: { location: { name: "Berlin", lat: 52.52, lon: 13.41 } },
  };
  const weatherKey = dataKey({ kind: "weather", params: { lat: 52.52, lon: 13.41 } });
  const weatherEntry = (source: string): DataEntry => ({
    result: {
      data: { tempC: 18, code: 0, isDay: true, highC: 20, lowC: 10, windKmh: 5, precipProb: 0 },
      fetchedAt: new Date().toISOString(),
      source,
      stale: false,
    },
    error: null,
  });
  const crypto: RenderWidget = { ...stock, widgetId: "c", type: "crypto", config: { coins: ["bitcoin"], vs: "eur" } };
  const cryptoKey = dataKey({ kind: "crypto", params: { id: "bitcoin", vs: "eur" } });
  const cryptoEntry: DataEntry = {
    result: {
      data: { id: "bitcoin", price: 60000, change24hPct: 1, currency: "eur", asOf: null },
      fetchedAt: new Date().toISOString(),
      source: "coingecko",
      stale: false,
    },
    error: null,
  };

  it("weather links Open-Meteo next to the data", async () => {
    wrap(<WidgetCell widget={weather} mode="standard" entries={{ [weatherKey]: weatherEntry("open-meteo") }} />);
    const link = screen.getByRole("link", { name: "Wetterdaten: Open-Meteo.com" });
    expect(link.getAttribute("href")).toBe("https://open-meteo.com/");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("weather demo data is labeled as such", async () => {
    wrap(<WidgetCell widget={weather} mode="standard" entries={{ [weatherKey]: weatherEntry("mock") }} />);
    expect(await screen.findByText("Demo-Daten")).toBeTruthy();
    expect(screen.queryByText(/Open-Meteo/)).toBeNull();
  });

  it("crypto links CoinGecko in standard mode", async () => {
    wrap(<WidgetCell widget={crypto} mode="standard" entries={{ [cryptoKey]: cryptoEntry }} />);
    expect((await screen.findByRole("link", { name: "Powered by CoinGecko" })).getAttribute("href")).toBe(
      "https://www.coingecko.com/",
    );
  });

  it("drive mode keeps the credits as plain text (no links)", async () => {
    const { container } = wrap(
      <>
        <WidgetCell widget={weather} mode="drive" entries={{ [weatherKey]: weatherEntry("open-meteo") }} />
        <WidgetCell widget={crypto} mode="drive" entries={{ [cryptoKey]: cryptoEntry }} />
      </>,
    );
    expect(await screen.findByText("Wetterdaten: Open-Meteo.com")).toBeTruthy();
    expect(await screen.findByText("Powered by CoinGecko")).toBeTruthy();
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });
});

describe("fx widget (ECB reference rates)", () => {
  const fxKey = dataKey({ kind: "fx", params: {} });
  const fxEntry = (source: string): DataEntry => ({
    result: {
      data: { date: "2026-09-28", rates: { USD: 1.1712, JPY: 172.5 }, prevDate: "2026-09-25", prev: { USD: 1.17 } },
      fetchedAt: new Date().toISOString(),
      source,
      stale: false,
    },
    error: null,
  });
  const fx = (currencies: string[]): RenderWidget => ({
    ...stock,
    widgetId: "fx",
    type: "fx",
    config: { currencies, showChange: true },
  });

  it("lists EUR pairs with change vs. previous day and links the ECB", async () => {
    wrap(<WidgetCell widget={fx(["USD", "JPY", "XXX"])} mode="standard" entries={{ [fxKey]: fxEntry("ecb") }} />);
    expect(await screen.findByText("EUR/USD")).toBeTruthy();
    expect(await screen.findByText("1,1712")).toBeTruthy();
    expect(await screen.findByText("172,50")).toBeTruthy();
    expect(await screen.findByText(/\+0,10 %/)).toBeTruthy();
    expect(await screen.findByText("—")).toBeTruthy();
    const link = screen.getByRole("link", { name: "EZB-Referenzkurse 28.09." });
    expect(link.getAttribute("href")).toContain("ecb.europa.eu");
  });

  it("drive mode: one pair, big value, credit as plain text", async () => {
    const { container } = wrap(
      <WidgetCell widget={fx(["USD", "JPY"])} mode="drive" entries={{ [fxKey]: fxEntry("ecb") }} />,
    );
    expect(await screen.findByText("EZB-Referenzkurse 28.09.")).toBeTruthy();
    expect(container.textContent).not.toContain("JPY");
    expect(container.querySelector("[data-bignumber]")?.textContent).toBe("1,1712");
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });

  it("mock data is labeled", async () => {
    wrap(<WidgetCell widget={fx(["USD"])} mode="standard" entries={{ [fxKey]: fxEntry("mock") }} />);
    expect(await screen.findByText("Demo-Daten")).toBeTruthy();
  });
});

describe("stocks without a licensed provider", () => {
  it("shows a hint instead of (old) quotes", async () => {
    wrap(
      <WidgetCell
        widget={stock}
        mode="standard"
        entries={{ [key]: { result: quote(new Date().toISOString()).result, error: "disabled" } }}
      />,
    );
    expect(await screen.findByText(/Aktienkurse sind derzeit nicht verfügbar/)).toBeTruthy();
    expect(screen.queryByText(/231,40/)).toBeNull();
  });
});
