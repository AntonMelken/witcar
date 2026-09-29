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
  it("loading", () => {
    wrap(<WidgetCell widget={stock} mode="standard" entries={{}} />);
    expect(screen.getByText("Lädt …")).toBeTruthy();
  });

  it("ok: price, arrow + sign, delayed-quote disclaimer", () => {
    wrap(<WidgetCell widget={stock} mode="standard" entries={{ [key]: quote(new Date().toISOString()) }} />);
    expect(screen.getByText(/231,40/)).toBeTruthy();
    expect(screen.getByText(/\+1,22 %/)).toBeTruthy();
    expect(screen.getByText("▲")).toBeTruthy();
    expect(screen.getByText(/Kurse verzögert, keine Anlageberatung/)).toBeTruthy();
    expect(document.querySelector("[data-stale]")).toBeNull();
  });

  it("stale: shows last data plus an age marker", () => {
    const old = new Date(Date.now() - 30 * 60_000).toISOString();
    wrap(<WidgetCell widget={stock} mode="standard" entries={{ [key]: quote(old, true) }} />);
    expect(screen.getByText(/231,40/)).toBeTruthy();
    expect(document.querySelector("[data-stale]")?.textContent).toMatch(/30 Min/);
  });

  it("error without data", () => {
    wrap(<WidgetCell widget={stock} mode="standard" entries={{ [key]: { result: null, error: "upstream_error" } }} />);
    expect(screen.getByText("Kurs nicht verfügbar")).toBeTruthy();
  });

  it("empty: weather without location, notes without text", () => {
    wrap(
      <>
        <WidgetCell
          widget={{ ...stock, widgetId: "w", type: "weather", config: { location: null } }}
          mode="standard"
          entries={{}}
        />
        <WidgetCell
          widget={{ ...stock, widgetId: "n", type: "notes", config: { text: "" } }}
          mode="standard"
          entries={{}}
        />
      </>,
    );
    expect(screen.getByText("Kein Ort gewählt")).toBeTruthy();
    expect(screen.getByText("Leere Notiz")).toBeTruthy();
  });

  it("locked widgets show an upgrade hint instead of content", () => {
    wrap(<WidgetCell widget={{ ...stock, locked: true }} mode="standard" entries={{}} />);
    expect(screen.getByText("Mit Pro verfügbar")).toBeTruthy();
  });

  it("a crashing widget is isolated by its error boundary", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    wrap(
      <>
        <WidgetCell
          widget={{ ...stock, widgetId: "bad", type: "weather", config: { location: { name: "X" } } }}
          mode="standard"
          entries={{}}
        />
        <WidgetCell
          widget={{ ...stock, widgetId: "ok", type: "notes", config: { text: "still here" } }}
          mode="standard"
          entries={{}}
        />
      </>,
    );
    expect(screen.getByText("still here")).toBeTruthy();
  });
});

describe("drive mode rendering", () => {
  it("timer and notes are display-only (no inputs, no buttons)", () => {
    const { container } = wrap(
      <>
        <WidgetCell
          widget={{ ...stock, widgetId: "t", type: "timer", config: { durationMin: 10, label: "" } }}
          mode="drive"
          entries={{}}
        />
        <WidgetCell
          widget={{ ...stock, widgetId: "n", type: "notes", config: { text: "x".repeat(200) } }}
          mode="drive"
          entries={{}}
        />
      </>,
    );
    expect(container.querySelectorAll("button, input, select, textarea")).toHaveLength(0);
    expect(screen.getByText("10 min")).toBeTruthy();
    expect(container.textContent).toContain("…");
  });

  it("stocks show a single ticker and a >= 64px main value", () => {
    const multi = { ...stock, config: { symbols: ["AAPL", "MSFT"], showChange: true } };
    const { container } = wrap(
      <WidgetCell widget={multi} mode="drive" entries={{ [key]: quote(new Date().toISOString()) }} />,
    );
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

  it("weather links Open-Meteo next to the data", () => {
    wrap(<WidgetCell widget={weather} mode="standard" entries={{ [weatherKey]: weatherEntry("open-meteo") }} />);
    const link = screen.getByRole("link", { name: "Wetterdaten: Open-Meteo.com" });
    expect(link.getAttribute("href")).toBe("https://open-meteo.com/");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("weather demo data is labeled as such", () => {
    wrap(<WidgetCell widget={weather} mode="standard" entries={{ [weatherKey]: weatherEntry("mock") }} />);
    expect(screen.getByText("Demo-Daten")).toBeTruthy();
    expect(screen.queryByText(/Open-Meteo/)).toBeNull();
  });

  it("crypto links CoinGecko in standard mode", () => {
    wrap(<WidgetCell widget={crypto} mode="standard" entries={{ [cryptoKey]: cryptoEntry }} />);
    expect(screen.getByRole("link", { name: "Powered by CoinGecko" }).getAttribute("href")).toBe(
      "https://www.coingecko.com/",
    );
  });

  it("drive mode keeps the credits as plain text (no links)", () => {
    const { container } = wrap(
      <>
        <WidgetCell widget={weather} mode="drive" entries={{ [weatherKey]: weatherEntry("open-meteo") }} />
        <WidgetCell widget={crypto} mode="drive" entries={{ [cryptoKey]: cryptoEntry }} />
      </>,
    );
    expect(screen.getByText("Wetterdaten: Open-Meteo.com")).toBeTruthy();
    expect(screen.getByText("Powered by CoinGecko")).toBeTruthy();
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

  it("lists EUR pairs with change vs. previous day and links the ECB", () => {
    wrap(<WidgetCell widget={fx(["USD", "JPY", "XXX"])} mode="standard" entries={{ [fxKey]: fxEntry("ecb") }} />);
    expect(screen.getByText("EUR/USD")).toBeTruthy();
    expect(screen.getByText("1,1712")).toBeTruthy();
    expect(screen.getByText("172,50")).toBeTruthy();
    expect(screen.getByText(/\+0,10 %/)).toBeTruthy();
    expect(screen.getByText("—")).toBeTruthy();
    const link = screen.getByRole("link", { name: "EZB-Referenzkurse 28.09." });
    expect(link.getAttribute("href")).toContain("ecb.europa.eu");
  });

  it("drive mode: one pair, big value, credit as plain text", () => {
    const { container } = wrap(
      <WidgetCell widget={fx(["USD", "JPY"])} mode="drive" entries={{ [fxKey]: fxEntry("ecb") }} />,
    );
    expect(container.textContent).not.toContain("JPY");
    expect(container.querySelector("[data-bignumber]")?.textContent).toBe("1,1712");
    expect(screen.getByText("EZB-Referenzkurse 28.09.")).toBeTruthy();
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });

  it("mock data is labeled", () => {
    wrap(<WidgetCell widget={fx(["USD"])} mode="standard" entries={{ [fxKey]: fxEntry("mock") }} />);
    expect(screen.getByText("Demo-Daten")).toBeTruthy();
  });
});

describe("stocks without a licensed provider", () => {
  it("shows a hint instead of (old) quotes", () => {
    wrap(
      <WidgetCell
        widget={stock}
        mode="standard"
        entries={{ [key]: { result: quote(new Date().toISOString()).result, error: "disabled" } }}
      />,
    );
    expect(screen.getByText(/Aktienkurse sind derzeit nicht verfügbar/)).toBeTruthy();
    expect(screen.queryByText(/231,40/)).toBeNull();
  });
});
