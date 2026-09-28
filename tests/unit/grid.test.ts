import { describe, expect, it } from "vitest";
import {
  arrangeForDrive,
  canPlace,
  clampPosition,
  driveArrangement,
  findFreeSpot,
  findOverlap,
  inBounds,
  moveItem,
  overlaps,
  readingOrder,
  resizeItem,
} from "@/lib/layout/grid";

const a = { widgetId: "a", x: 0, y: 0, w: 4, h: 4 };
const b = { widgetId: "b", x: 4, y: 0, w: 4, h: 4 };

describe("grid engine", () => {
  it("detects overlaps and bounds", () => {
    expect(overlaps(a, b)).toBe(false);
    expect(overlaps(a, { x: 3, y: 3, w: 2, h: 2 })).toBe(true);
    expect(inBounds({ x: 10, y: 0, w: 3, h: 1 })).toBe(false);
    expect(inBounds({ x: 0, y: 6, w: 1, h: 2 })).toBe(true);
    expect(inBounds({ x: 0.5, y: 0, w: 1, h: 1 })).toBe(false);
  });

  it("places, moves and resizes without collisions", () => {
    expect(canPlace([a, b], { x: 8, y: 0, w: 4, h: 4 })).toBe(true);
    expect(canPlace([a, b], { x: 2, y: 0, w: 4, h: 4 })).toBe(false);
    expect(findFreeSpot([a, b], 4, 4)).toEqual({ x: 8, y: 0 });
    expect(moveItem([a, b], "a", 3, 0)).toBeNull();
    expect(moveItem([a, b], "a", 0, 4)).toEqual([{ ...a, y: 4 }, b]);
    expect(resizeItem([a, b], "a", 5, 4)).toBeNull();
    expect(resizeItem([a, b], "a", 2, 2, { w: 3, h: 2 })).toBeNull();
    expect(resizeItem([a, b], "a", 3, 2, { w: 3, h: 2 })).toEqual([{ ...a, w: 3, h: 2 }, b]);
  });

  it("returns null when the grid is full", () => {
    const full = [0, 4, 8].flatMap((x) => [0, 4].map((y) => ({ widgetId: `${x}${y}`, x, y, w: 4, h: 4 })));
    expect(findFreeSpot(full, 1, 1)).toBeNull();
    expect(findOverlap(full)).toBeNull();
  });

  it("clamps positions and sorts in reading order", () => {
    expect(clampPosition(a, 20, -3)).toEqual({ x: 8, y: 0 });
    expect(readingOrder([b, { ...a, y: 4 }, a]).map((w) => `${w.x},${w.y}`)).toEqual(["0,0", "4,0", "0,4"]);
  });

  it("arranges drive mode tiles large and without overlap", () => {
    for (let n = 1; n <= 6; n++) {
      const rects = driveArrangement(n);
      expect(rects).toHaveLength(n);
      expect(findOverlap(rects.map((r, i) => ({ ...r, widgetId: String(i) })))).toBeNull();
      for (const r of rects) expect(inBounds(r)).toBe(true);
    }
    expect(driveArrangement(9)).toHaveLength(6);
    const items = Array.from({ length: 8 }, (_, i) => ({ widgetId: String(i), x: 0, y: 0, w: 1, h: 1 }));
    expect(arrangeForDrive(items)).toHaveLength(6);
    expect(driveArrangement(4)[0]).toEqual({ x: 0, y: 0, w: 6, h: 4 });
  });
});
