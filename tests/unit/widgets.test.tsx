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
