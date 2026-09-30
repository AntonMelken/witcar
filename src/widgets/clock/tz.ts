/** Time zone helpers shared by the clock widget, its schema and its app (no dependencies). */

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** "Europe/Berlin" -> "Berlin", "America/Argentina/Buenos_Aires" -> "Buenos Aires" */
export function zoneCity(tz: string): string {
  return (tz.split("/").pop() ?? tz).replace(/_/g, " ");
}

/** Time zone of this device/browser (the car's setting in a car browser). */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function ymd(date: Date, tz: string | undefined): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    date,
  );
}

/** Whole calendar days between the device's date and the date in `tz` (-1 yesterday, +1 tomorrow). */
export function dayDelta(date: Date, tz: string): number {
  const other = Date.parse(`${ymd(date, tz)}T00:00:00Z`);
  const here = Date.parse(`${ymd(date, undefined)}T00:00:00Z`);
  return Math.round((other - here) / 86_400_000);
}

/** "UTC+2", "UTC−3:30", "UTC" for a zone at a moment. */
export function utcOffsetLabel(tz: string | undefined, date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  const minutes = Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60_000);
  if (minutes === 0) return "UTC";
  const sign = minutes > 0 ? "+" : "−";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}
