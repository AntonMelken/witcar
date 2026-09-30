import { describe, expect, it } from "vitest";
import { browserZones, CITY_ZONES, nearestCity, searchZones } from "@/widgets/clock/cities";
import { clockSchema } from "@/widgets/clock/schema";
import { dayDelta, isValidTimeZone, utcOffsetLabel, zoneCity } from "@/widgets/clock/tz";
import { notesSchema } from "@/widgets/notes/schema";
import { activeNote } from "@/widgets/notes/definition";
import {
  areaPath,
  indexAt,
  linePath,
  paddedRange,
  parseAmount,
  periodStats,
  positionValue,
  sma,
  smaWindow,
} from "@/widgets/stocks/chartMath";
import { stocksSchema } from "@/widgets/stocks/schema";
import {
  addTime,
  digitsDisplay,
  digitsToSeconds,
  isDone,
  pause,
  progress,
  remainingMs,
  splitDuration,
  start,
} from "@/widgets/timer/logic";
import { timerSchema } from "@/widgets/timer/schema";
import { dayMonthLabel, rangePosition, weatherCondition, weekdayLabel } from "@/widgets/weather/forecast";
import { weatherPlaces } from "@/widgets/weather/definition";
import { weatherSchema } from "@/widgets/weather/schema";

describe("timer", () => {
  it("types a time like a microwave", () => {
    expect(digitsToSeconds("")).toBe(0);
    expect(digitsToSeconds("5")).toBe(5);
    expect(digitsToSeconds("130")).toBe(90);
    expect(digitsToSeconds("1000")).toBe(600);
    expect(digitsToSeconds("10530")).toBe(3600 + 5 * 60 + 30);
    expect(digitsToSeconds("9999")).toBe(99 * 60 + 99);
    expect(digitsDisplay("10530")).toBe("01:05:30");
    expect(digitsDisplay("")).toBe("00:00:00");
    // only the last six digits count
    expect(digitsToSeconds("1234567")).toBe(digitsToSeconds("234567"));
  });

  it("splits a duration", () => {
    expect(splitDuration(3725)).toEqual({ h: 1, m: 2, s: 5 });
    expect(splitDuration(0)).toEqual({ h: 0, m: 0, s: 0 });
  });

  it("runs, pauses, resumes, adds time and finishes", () => {
    const d = 60_000;
    let s = start({ status: "idle" }, d, 1000);
    expect(s).toEqual({ status: "running", endsAt: 61_000 });
    expect(remainingMs(s, d, 31_000)).toBe(30_000);
    s = pause(s, 31_000);
    expect(s).toEqual({ status: "paused", remainingMs: 30_000 });
    expect(remainingMs(s, d, 999_999)).toBe(30_000);
    s = start(s, d, 100_000);
    expect(s).toEqual({ status: "running", endsAt: 130_000 });
    s = addTime(s, d, 60_000, 100_000);
    expect(s).toEqual({ status: "running", endsAt: 190_000 });
    expect(isDone(s, 189_999)).toBe(false);
    expect(isDone(s, 190_000)).toBe(true);
    expect(remainingMs(s, d, 500_000)).toBe(0);
    expect(progress({ status: "idle" }, d, 0)).toBe(0);
    expect(progress({ status: "running", endsAt: 130_000 }, d, 100_000)).toBeCloseTo(0.5);
  });

  it("adding time to an idle timer starts it; removing never goes below one second", () => {
    expect(addTime({ status: "idle" }, 60_000, 60_000, 0)).toEqual({ status: "running", endsAt: 120_000 });
    expect(addTime({ status: "paused", remainingMs: 5000 }, 60_000, -60_000, 0)).toEqual({
      status: "paused",
      remainingMs: 1000,
    });
    expect(pause({ status: "idle" }, 0)).toEqual({ status: "idle" });
  });

  it("converts legacy minute configs and limits the range", () => {
    expect(timerSchema.parse({ durationMin: 15, label: "x" })).toEqual({ durationSec: 900, label: "x" });
    expect(timerSchema.parse({})).toEqual({ durationSec: 600, label: "" });
    expect(timerSchema.parse({ durationSec: 95 })).toMatchObject({ durationSec: 95 });
    expect(timerSchema.safeParse({ durationSec: 0 }).success).toBe(false);
    expect(timerSchema.safeParse({ durationSec: 24 * 3600 + 1 }).success).toBe(false);
    expect(timerSchema.safeParse({ durationSec: 1.5 }).success).toBe(false);
  });
});

describe("notes", () => {
  it("converts the legacy single text", () => {
    expect(notesSchema.parse({ text: "Hallo" })).toEqual({
      notes: [{ id: "n1", title: "", text: "Hallo" }],
      activeId: "n1",
    });
    expect(notesSchema.parse({ text: "" })).toEqual({ notes: [], activeId: null });
    expect(notesSchema.parse({})).toEqual({ notes: [], activeId: null });
  });

  it("repairs an active id that does not exist and validates limits", () => {
    const cfg = notesSchema.parse({
      notes: [
        { id: "a", title: "A", text: "1" },
        { id: "b", title: "B", text: "2" },
      ],
      activeId: "gone",
    }) as { notes: { id: string }[]; activeId: string | null };
    expect(cfg.activeId).toBe("a");
    expect(notesSchema.safeParse({ notes: [{ id: "bad id!", title: "", text: "" }] }).success).toBe(false);
    expect(notesSchema.safeParse({ notes: [{ id: "a", title: "", text: "x".repeat(601) }] }).success).toBe(false);
    expect(
      notesSchema.safeParse({ notes: Array.from({ length: 13 }, (_, k) => ({ id: `n${k}`, title: "", text: "" })) })
        .success,
    ).toBe(false);
  });

  it("shows the chosen note, else the first", () => {
    const cfg = {
      notes: [
        { id: "a", title: "A", text: "1" },
        { id: "b", title: "B", text: "2" },
      ],
      activeId: "b",
    };
    expect(activeNote(cfg)?.id).toBe("b");
    expect(activeNote({ ...cfg, activeId: null })?.id).toBe("a");
    expect(activeNote({ notes: [], activeId: null })).toBeNull();
  });
});

describe("clock", () => {
  it("validates time zones and keeps old configs valid", () => {
    expect(isValidTimeZone("Europe/Berlin")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(clockSchema.parse({ showSeconds: true, timeZone: "Asia/Tokyo", label: "" })).toEqual({
      showSeconds: true,
      hour12: false,
      timeZone: "Asia/Tokyo",
      label: "",
      zones: [],
    });
    expect(clockSchema.parse({}).timeZone).toBe("local");
    expect(clockSchema.safeParse({ timeZone: "Nowhere/Land" }).success).toBe(false);
    expect(clockSchema.safeParse({ zones: [{ timeZone: "Nowhere/Land", label: "" }] }).success).toBe(false);
    const seven = Array.from({ length: 7 }, () => ({ timeZone: "Europe/London", label: "" }));
    expect(clockSchema.safeParse({ zones: seven }).success).toBe(false);
  });

  it("computes offsets and day differences", () => {
    const summer = new Date("2026-07-01T12:00:00Z");
    expect(utcOffsetLabel("Europe/Berlin", summer)).toBe("UTC+2");
    expect(utcOffsetLabel("Asia/Kolkata", summer)).toBe("UTC+5:30");
    expect(utcOffsetLabel("America/New_York", summer)).toBe("UTC−4");
    expect(utcOffsetLabel("UTC", summer)).toBe("UTC");
    expect(dayDelta(new Date("2026-07-01T23:30:00Z"), "UTC")).toBe(0);
    expect(zoneCity("America/Argentina/Buenos_Aires")).toBe("Buenos Aires");
  });

  it("searches cities by name, country and zone id, ignoring case and accents", () => {
    expect(searchZones("").length).toBeGreaterThan(5);
    expect(searchZones("zurich")[0]?.tz).toBe("Europe/Zurich");
    expect(searchZones("ZÜRICH")[0]?.tz).toBe("Europe/Zurich");
    expect(searchZones("japan").map((z) => z.tz)).toContain("Asia/Tokyo");
    expect(searchZones("new_york").map((z) => z.tz)).toContain("America/New_York");
    expect(searchZones("qqqqqq")).toEqual([]);
    // zones the browser knows but the city list does not
    expect(searchZones("lord howe", ["Australia/Lord_Howe"])[0]?.tz).toBe("Australia/Lord_Howe");
    expect(new Set(CITY_ZONES.map((c) => c.tz)).size).toBe(CITY_ZONES.length);
    for (const c of CITY_ZONES) expect(isValidTimeZone(c.tz), c.tz).toBe(true);
    expect(Array.isArray(browserZones())).toBe(true);
  });

  it("finds the nearest city for a position", () => {
    expect(nearestCity(52.4, 13.1).city.tz).toBe("Europe/Berlin");
    expect(nearestCity(35.7, 139.7).city.tz).toBe("Asia/Tokyo");
    expect(nearestCity(-33.9, 151.2).km).toBeLessThan(20);
  });
});

describe("weather", () => {
  it("keeps old configs valid and limits the extra places", () => {
    expect(weatherSchema.parse({ location: { name: "Berlin", lat: 52.5, lon: 13.4 } })).toEqual({
      location: { name: "Berlin", lat: 52.5, lon: 13.4 },
      extra: [],
      showWeek: true,
    });
    const place = { name: "X", lat: 1, lon: 2 };
    expect(weatherSchema.safeParse({ extra: Array.from({ length: 6 }, () => place) }).success).toBe(false);
    expect(weatherSchema.safeParse({ extra: [{ name: "X", lat: 91, lon: 0 }] }).success).toBe(false);
  });

  it("lists the main place first and only that one in drive mode", () => {
    const cfg = {
      location: { name: "A", lat: 1, lon: 1 },
      extra: [{ name: "B", lat: 2, lon: 2 }],
      showWeek: true,
    };
    expect(weatherPlaces(cfg).map((p) => p.name)).toEqual(["A", "B"]);
    expect(weatherPlaces(cfg, "drive").map((p) => p.name)).toEqual(["A"]);
    expect(weatherPlaces({ ...cfg, location: null })).toEqual([]);
  });

  it("labels forecast days with the right weekday in any time zone", () => {
    // 2026-09-28 is a Monday
    expect(weekdayLabel("2026-09-28", "long")).toBe("Montag");
    expect(weekdayLabel("2026-10-04", "long")).toBe("Sonntag");
    expect(weekdayLabel("2026-09-29", "short")).toMatch(/^Di/);
    expect(dayMonthLabel("2026-09-29")).toBe("29.09.");
    expect(weekdayLabel("garbage", "long")).toBe("");
    expect(rangePosition(5, 0, 10)).toBe(0.5);
    expect(rangePosition(5, 5, 5)).toBe(0.5);
    expect(rangePosition(20, 0, 10)).toBe(1);
    expect(weatherCondition(61, true).key).toBe("rain");
    expect(weatherCondition(0, false).icon).toBe("moon");
  });
});

describe("stocks chart tools", () => {
  it("computes a moving average", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
    expect(sma([2, 4], 1)).toEqual([2, 4]);
    expect(smaWindow(8)).toBe(3);
    expect(smaWindow(80)).toBe(10);
  });

  it("summarizes a period", () => {
    const pts = [100, 110, 90, 105].map((c, k) => ({ t: k, c }));
    const s = periodStats(pts)!;
    expect(s).toMatchObject({ first: 100, last: 105, high: 110, low: 90, change: 5 });
    expect(s.changePct).toBeCloseTo(5);
    expect(periodStats([])).toBeNull();
  });

  it("scales values into the chart", () => {
    const r = paddedRange([10, 20]);
    expect(r.min).toBeLessThan(10);
    expect(r.max).toBeGreaterThan(20);
    const flat = paddedRange([5, 5, 5]);
    expect(flat.max).toBeGreaterThan(flat.min);
    expect(paddedRange([])).toEqual({ min: 0, max: 1 });
    const path = linePath([0, 10], 100, 50, { min: 0, max: 10 });
    expect(path).toBe("M0.0 50.0L100.0 0.0");
    expect(linePath([1, null, 3], 100, 10, { min: 0, max: 4 })).toMatch(/^M0\.0 [\d.]+M100\.0 [\d.]+$/);
    expect(areaPath([0, 10], 100, 50, { min: 0, max: 10 })).toBe("M0.0 50.0L100.0 0.0L100.0 50L0.0 50Z");
    expect(linePath([], 100, 50, { min: 0, max: 1 })).toBe("");
  });

  it("maps a pointer position to a data point", () => {
    expect(indexAt(0, 10)).toBe(0);
    expect(indexAt(1, 10)).toBe(9);
    expect(indexAt(0.5, 11)).toBe(5);
    expect(indexAt(2, 10)).toBe(9);
    expect(indexAt(-1, 10)).toBe(0);
    expect(indexAt(0.5, 1)).toBe(0);
  });

  it("parses typed amounts and values a position", () => {
    expect(parseAmount("10")).toBe(10);
    expect(parseAmount("1.234,5")).toBe(1234.5);
    expect(parseAmount("12,5")).toBe(12.5);
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("-3")).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(positionValue(10, 120, 100)).toEqual({ value: 1200, cost: 1000, gain: 200, gainPct: 20 });
    expect(positionValue(2, 50, null)).toEqual({ value: 100, cost: null, gain: null, gainPct: null });
  });

  it("stocks config still accepts old data", () => {
    expect(stocksSchema.parse({ symbols: ["AAPL"] })).toEqual({ symbols: ["AAPL"], showChange: true });
    expect(stocksSchema.safeParse({ symbols: [] }).success).toBe(false);
    expect(stocksSchema.safeParse({ symbols: Array.from({ length: 21 }, (_, k) => `S${k}`) }).success).toBe(false);
  });
});
