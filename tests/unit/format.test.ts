import { describe, expect, it } from "vitest";
import { formatAge, formatDuration, formatPrice, formatSignedPercent, formatTime } from "@/lib/client/format";
import { nextDelay } from "@/lib/client/useDashboardData";
import { scrub } from "@/lib/log";

describe("formatting (de-DE)", () => {
  it("formats numbers, prices and signed percentages", () => {
    expect(formatPrice(231.4, "USD")).toMatch(/231,40\s\$/);
    expect(formatPrice(58187.3, "eur")).toMatch(/58\.187\s€/);
    expect(formatSignedPercent(1.234)).toBe("+1,23 %");
    expect(formatSignedPercent(-0.5)).toBe("−0,50 %");
    expect(formatSignedPercent(0)).toBe("±0,00 %");
  });

  it("formats 24h time and durations", () => {
    const d = new Date("2026-09-28T21:05:09Z");
    expect(formatTime(d, { seconds: false, timeZone: "Europe/Berlin" })).toBe("23:05");
    expect(formatTime(d, { seconds: true, timeZone: "Europe/Berlin" })).toBe("23:05:09");
    expect(formatDuration(65_000, true)).toBe("01:05");
    expect(formatDuration(65_000, false)).toBe("2 min");
    expect(formatDuration(3_725_000, true)).toBe("1:02:05");
    expect(formatAge(12 * 60_000)).toMatch(/12 Min/);
  });
});

describe("polling backoff", () => {
  it("uses the refresh interval (>= 60 s) with ±10 % jitter", () => {
    expect(nextDelay(10_000, 0, () => 0.5)).toBe(60_000);
    expect(nextDelay(120_000, 0, () => 0)).toBe(108_000);
    expect(nextDelay(120_000, 0, () => 0.9999)).toBeLessThanOrEqual(132_000);
  });

  it("backs off exponentially on errors up to 5 minutes", () => {
    expect(nextDelay(60_000, 1, () => 0.5)).toBe(10_000);
    expect(nextDelay(60_000, 3, () => 0.5)).toBe(40_000);
    expect(nextDelay(60_000, 20, () => 0.5)).toBe(300_000);
  });
});

describe("log scrubbing", () => {
  it("removes e-mails and tokens", () => {
    expect(scrub("user max@example.com failed with abcdefghijklmnopqrstuvwxyz0123456789ABCD")).toBe(
      "user [email] failed with [token]",
    );
  });
});
