import { describe, expect, it } from "vitest";
import { applyPlanForDisplay, validateLayout, type LayoutWidget } from "@/lib/layout/schema";
import { DEMO_LAYOUT } from "@/lib/layout/fixtures";

const w = (
  id: string,
  type: LayoutWidget["type"],
  x: number,
  y: number,
  config: Record<string, unknown> = {},
): LayoutWidget => ({
  widgetId: id,
  type,
  x,
  y,
  w: 4,
  h: 4,
  config,
});

describe("validateLayout", () => {
  it("accepts a valid free layout and normalizes configs", () => {
    const res = validateLayout([w("a", "clock", 0, 0), w("b", "stocks", 4, 0)], "standard", "free");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.widgets[1]!.config).toEqual({ symbols: ["AAPL"], showChange: true });
  });

  it("enforces the free widget limit server-side", () => {
    const four = [w("a", "clock", 0, 0), w("b", "date", 4, 0), w("c", "timer", 8, 0), w("d", "clock", 0, 4)];
    expect(validateLayout(four, "standard", "free")).toEqual({ ok: false, code: "too_many_widgets" });
    expect(validateLayout(four, "standard", "pro").ok).toBe(true);
  });

  it("blocks pro-only widgets and ticker overhang on free", () => {
    expect(validateLayout([w("n", "notes", 0, 0)], "standard", "free")).toMatchObject({ code: "pro_widget" });
    const many = w("s", "stocks", 0, 0, { symbols: ["A", "B", "C", "D"] });
    expect(validateLayout([many], "standard", "free")).toMatchObject({ code: "too_many_tickers" });
    expect(validateLayout([many], "standard", "pro").ok).toBe(true);
  });

  it("rejects overlaps, duplicates, invalid configs and too small widgets", () => {
    expect(validateLayout([w("a", "clock", 0, 0), w("b", "clock", 2, 2)], "standard", "pro")).toMatchObject({
      code: "overlap",
    });
    expect(validateLayout([w("a", "clock", 0, 0), w("a", "clock", 4, 0)], "standard", "pro")).toMatchObject({
      code: "duplicate_widget_id",
    });
    expect(validateLayout([w("a", "stocks", 0, 0, { symbols: ["<script>"] })], "standard", "pro")).toMatchObject({
      code: "invalid_config",
    });
    expect(validateLayout([{ ...w("a", "weather", 0, 0), w: 1, h: 1 }], "standard", "pro")).toMatchObject({
      code: "too_small",
    });
    expect(validateLayout([{ ...w("a", "clock", 0, 0), x: 10 }], "standard", "pro")).toMatchObject({
      code: "out_of_bounds",
    });
  });

  it("limits drive mode to 6 widgets", () => {
    const seven = Array.from({ length: 7 }, (_, i) => w(`c${i}`, "clock", 0, 0));
    expect(validateLayout(seven, "drive", "pro")).toMatchObject({ code: "too_many_widgets" });
    expect(validateLayout(seven.slice(0, 6), "drive", "pro").ok).toBe(true);
  });

  it("the demo fixture is a valid pro layout", () => {
    expect(validateLayout(DEMO_LAYOUT, "standard", "pro").ok).toBe(true);
  });
});

describe("applyPlanForDisplay (downgrade without data loss)", () => {
  it("locks overhang and pro widgets, truncates tickers, keeps everything", () => {
    const out = applyPlanForDisplay(DEMO_LAYOUT, "free", "standard");
    expect(out).toHaveLength(DEMO_LAYOUT.length);
    const unlocked = out.filter((x) => !x.locked);
    expect(unlocked).toHaveLength(3);
    expect(out.find((x) => x.type === "notes")!.locked).toBe(true);
    const stocks = out.find((x) => x.type === "stocks")!;
    expect(stocks.locked).toBe(false);
    expect((stocks.config.symbols as string[]).length).toBe(3);
  });

  it("pro sees everything", () => {
    expect(applyPlanForDisplay(DEMO_LAYOUT, "pro", "standard").every((x) => !x.locked)).toBe(true);
  });
});
