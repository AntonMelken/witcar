/** Locale-aware formatting helpers with cached Intl instances. */
const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>();

function memo<T extends Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat>(
  key: string,
  make: () => T,
): T {
  let v = cache.get(key) as T | undefined;
  if (!v) {
    v = make();
    cache.set(key, v);
  }
  return v;
}

export function formatNumber(value: number, locale = "de-DE", digits?: { min?: number; max?: number }): string {
  const min = digits?.min ?? 0;
  const max = digits?.max ?? 2;
  return memo(
    `n:${locale}:${min}:${max}`,
    () => new Intl.NumberFormat(locale, { minimumFractionDigits: min, maximumFractionDigits: max }),
  ).format(value);
}

export function formatPrice(value: number, currency: string | null, locale = "de-DE"): string {
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 0 : abs >= 1 ? 2 : 4;
  if (!currency) return formatNumber(value, locale, { min: digits, max: digits });
  return memo(
    `c:${locale}:${currency}:${digits}`,
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency.toUpperCase(),
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }),
  ).format(value);
}

/** "+1,23 %" / "−0,50 %" with an explicit sign (colorblind-safe, §12.1). */
export function formatSignedPercent(value: number, locale = "de-DE"): string {
  const s = formatNumber(Math.abs(value), locale, { min: 2, max: 2 });
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  return `${sign}${s} %`;
}

export function formatTime(date: Date, opts: { seconds: boolean; timeZone?: string }, locale = "de-DE"): string {
  const tz = opts.timeZone && opts.timeZone !== "local" ? opts.timeZone : undefined;
  return memo(
    `t:${locale}:${opts.seconds}:${tz ?? ""}`,
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: opts.seconds ? "2-digit" : undefined,
        hourCycle: "h23",
        timeZone: tz,
      }),
  ).format(date);
}

export function formatDate(date: Date, style: "long" | "short", locale = "de-DE"): string {
  const opts: Intl.DateTimeFormatOptions =
    style === "long"
      ? { weekday: "long", day: "numeric", month: "long" }
      : { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" };
  return memo(`d:${locale}:${style}`, () => new Intl.DateTimeFormat(locale, opts)).format(date);
}

/** "vor 12 Min." relative age for stale markers. */
export function formatAge(ms: number, locale = "de-DE"): string {
  const rtf = memo(
    `r:${locale}`,
    () => new Intl.RelativeTimeFormat(locale, { numeric: "always", style: "short" }),
  ) as Intl.RelativeTimeFormat;
  const min = Math.round(ms / 60_000);
  if (min < 60) return rtf.format(-Math.max(1, min), "minute");
  const h = Math.round(min / 60);
  if (h < 48) return rtf.format(-h, "hour");
  return rtf.format(-Math.round(h / 24), "day");
}

export function formatDuration(ms: number, withSeconds: boolean): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (!withSeconds) {
    const mins = Math.ceil(total / 60);
    return h > 0 ? `${Math.floor(mins / 60)}:${pad(mins % 60)} h` : `${mins} min`;
  }
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
