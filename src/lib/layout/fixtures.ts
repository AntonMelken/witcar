import type { LayoutWidget } from "./schema";

/** Fixture used by /demo, tests and as onboarding suggestion. */
export const DEMO_LAYOUT: LayoutWidget[] = [
  {
    widgetId: "demo-clock",
    type: "clock",
    x: 0,
    y: 0,
    w: 4,
    h: 4,
    config: {
      showSeconds: false,
      hour12: false,
      timeZone: "local",
      label: "",
      zones: [
        { timeZone: "America/New_York", label: "New York" },
        { timeZone: "Asia/Tokyo", label: "Tokio" },
      ],
    },
  },
  {
    widgetId: "demo-weather",
    type: "weather",
    x: 4,
    y: 0,
    w: 4,
    h: 4,
    config: { location: { name: "Berlin", lat: 52.52, lon: 13.41 }, extra: [], showWeek: true },
  },
  {
    widgetId: "demo-stocks",
    type: "stocks",
    x: 8,
    y: 0,
    w: 4,
    h: 4,
    config: { symbols: ["AAPL", "MSFT", "SAP"], showChange: true },
  },
  { widgetId: "demo-date", type: "date", x: 0, y: 4, w: 4, h: 2, config: { style: "long" } },
  { widgetId: "demo-timer", type: "timer", x: 0, y: 6, w: 4, h: 2, config: { durationSec: 900, label: "" } },
  { widgetId: "demo-crypto", type: "crypto", x: 4, y: 4, w: 4, h: 4, config: { coins: ["bitcoin"], vs: "eur" } },
  {
    widgetId: "demo-notes",
    type: "notes",
    x: 8,
    y: 4,
    w: 4,
    h: 4,
    config: {
      notes: [
        { id: "n1", title: "Unterwegs", text: "Ladestopp: 25 min\nEinkaufsliste im Handy" },
        { id: "n2", title: "Termine", text: "Do 9:00 Werkstatt" },
      ],
      activeId: "n1",
    },
  },
];

export const STARTER_TYPES = ["clock", "weather", "stocks"] as const;
