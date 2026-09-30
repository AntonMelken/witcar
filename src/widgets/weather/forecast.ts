import type { IconName } from "@/components/dashboard/icons";

/** WMO weather code -> condition key + icon */
export function weatherCondition(code: number, isDay: boolean): { key: string; icon: IconName } {
  if (code === 0) return { key: "clear", icon: isDay ? "sun" : "moon" };
  if (code <= 2) return { key: "partly", icon: isDay ? "cloudSun" : "cloud" };
  if (code === 3) return { key: "cloudy", icon: "cloud" };
  if (code === 45 || code === 48) return { key: "fog", icon: "fog" };
  if (code >= 51 && code <= 57) return { key: "drizzle", icon: "drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { key: "rain", icon: "rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { key: "snow", icon: "snow" };
  if (code >= 95) return { key: "storm", icon: "storm" };
  return { key: "cloudy", icon: "cloud" };
}

/**
 * Weekday of a forecast day. `date` is the calendar day at the place
 * (YYYY-MM-DD); noon UTC keeps the weekday right in every time zone.
 */
export function weekdayLabel(date: string, style: "short" | "long", locale = "de-DE"): string {
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { weekday: style, timeZone: "UTC" }).format(d);
}

/** "29.09." */
export function dayMonthLabel(date: string, locale = "de-DE"): string {
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(d);
}

/** Position 0..1 of `value` between the lowest and highest value of the week (for the range bar). */
export function rangePosition(value: number, min: number, max: number): number {
  return max === min ? 0.5 : Math.min(1, Math.max(0, (value - min) / (max - min)));
}
