import type { ActiveWidgetType } from "./meta";
import type { WidgetComponent } from "./types";
import ClockWidget from "./clock/Widget";
import CryptoWidget from "./crypto/Widget";
import DateWidget from "./date/Widget";
import NotesWidget from "./notes/Widget";
import StocksWidget from "./stocks/Widget";
import TimerWidget from "./timer/Widget";
import WeatherWidget from "./weather/Widget";

/** Client-side component map; keep in sync with registry.ts. */
export const widgetComponents: Record<ActiveWidgetType, WidgetComponent<never>> = {
  clock: ClockWidget,
  date: DateWidget,
  weather: WeatherWidget,
  stocks: StocksWidget,
  crypto: CryptoWidget,
  timer: TimerWidget,
  notes: NotesWidget,
};
