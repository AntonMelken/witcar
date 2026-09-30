import type { StockPoint, StockRange } from "./definition";

/** Simple moving average; the first `window - 1` values are null. */
export function sma(values: number[], window: number): (number | null)[] {
  const w = Math.max(1, Math.floor(window));
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= w) sum -= values[i - w]!;
    out.push(i >= w - 1 ? sum / w : null);
  }
  return out;
}

/** Window used for the average line: about an eighth of the points, at least 3. */
export function smaWindow(count: number): number {
  return Math.max(3, Math.round(count / 8));
}

export interface PeriodStats {
  first: number;
  last: number;
  high: number;
  low: number;
  change: number;
  changePct: number | null;
}

export function periodStats(points: StockPoint[]): PeriodStats | null {
  if (points.length === 0) return null;
  const closes = points.map((p) => p.c);
  const first = closes[0]!;
  const last = closes[closes.length - 1]!;
  return {
    first,
    last,
    high: Math.max(...closes),
    low: Math.min(...closes),
    change: last - first,
    changePct: first !== 0 ? ((last - first) / first) * 100 : null,
  };
}

/** Value range of a chart with a little air above and below (flat data still gets a visible range). */
export function paddedRange(values: number[]): { min: number; max: number } {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return { min: 0, max: 1 };
  const lo = Math.min(...finite);
  const hi = Math.max(...finite);
  const span = hi - lo || Math.abs(hi) * 0.02 || 1;
  return { min: lo - span * 0.08, max: hi + span * 0.08 };
}

/** SVG path through the values (`null` values break the line). x spans 0..width. */
export function linePath(
  values: (number | null)[],
  width: number,
  height: number,
  range: { min: number; max: number },
): string {
  const n = values.length;
  if (n === 0) return "";
  const span = range.max - range.min || 1;
  let d = "";
  let pen = false;
  values.forEach((v, i) => {
    if (v == null || !Number.isFinite(v)) {
      pen = false;
      return;
    }
    const x = n === 1 ? width / 2 : (i / (n - 1)) * width;
    const y = height - ((v - range.min) / span) * height;
    d += `${pen ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    pen = true;
  });
  return d;
}

/** Closed area under the line for a fill (no gaps). */
export function areaPath(values: number[], width: number, height: number, range: { min: number; max: number }): string {
  const line = linePath(values, width, height, range);
  if (!line) return "";
  const n = values.length;
  const endX = n === 1 ? width / 2 : width;
  const startX = n === 1 ? width / 2 : 0;
  return `${line}L${endX.toFixed(1)} ${height}L${startX.toFixed(1)} ${height}Z`;
}

/** Index of the point closest to a horizontal position (0..1 of the chart width). */
export function indexAt(fraction: number, count: number): number {
  if (count <= 1) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(fraction * (count - 1))));
}

/** Time label for the x axis / tooltip: time of day for 1 day, date otherwise (Europe/Berlin like the rest of the UI). */
export function timeLabel(t: number, range: StockRange, withTime = false, locale = "de-DE"): string {
  const d = new Date(t * 1000);
  if (range === "1T") {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  }
  if (range === "1W" && withTime) {
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(d);
  }
  if (range === "1J") return new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit" }).format(d);
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit" }).format(d);
}

/** Value of a position and its result against the buy price. */
export function positionValue(
  quantity: number,
  price: number,
  buyPrice: number | null,
): { value: number; cost: number | null; gain: number | null; gainPct: number | null } {
  const value = quantity * price;
  if (buyPrice == null || buyPrice <= 0) return { value, cost: null, gain: null, gainPct: null };
  const cost = quantity * buyPrice;
  return { value, cost, gain: value - cost, gainPct: cost !== 0 ? ((value - cost) / cost) * 100 : null };
}

/** Parses "1.234,5" / "1234.5" / "12,5" typed by the user; null when not a positive number. */
export function parseAmount(text: string): number | null {
  const s = text.trim().replace(/\s/g, "");
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}
