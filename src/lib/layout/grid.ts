/**
 * Pure grid layout engine (masterplan §10.1). 12 columns x 8 rows.
 * All functions are immutable: they return new arrays or null when invalid.
 */

export const GRID_COLS = 12;
export const GRID_ROWS = 8;
export const DRIVE_MAX_WIDGETS = 6;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GridItem extends Rect {
  widgetId: string;
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function inBounds(r: Rect, cols = GRID_COLS, rows = GRID_ROWS): boolean {
  return (
    Number.isInteger(r.x) &&
    Number.isInteger(r.y) &&
    Number.isInteger(r.w) &&
    Number.isInteger(r.h) &&
    r.w >= 1 &&
    r.h >= 1 &&
    r.x >= 0 &&
    r.y >= 0 &&
    r.x + r.w <= cols &&
    r.y + r.h <= rows
  );
}

export function canPlace<T extends GridItem>(items: readonly T[], rect: Rect, ignoreId?: string): boolean {
  if (!inBounds(rect)) return false;
  return items.every((it) => it.widgetId === ignoreId || !overlaps(it, rect));
}

/** First free top-left position (row-major) for a w x h block, or null. */
export function findFreeSpot<T extends GridItem>(
  items: readonly T[],
  w: number,
  h: number,
): { x: number; y: number } | null {
  for (let y = 0; y + h <= GRID_ROWS; y++) {
    for (let x = 0; x + w <= GRID_COLS; x++) {
      if (canPlace(items, { x, y, w, h })) return { x, y };
    }
  }
  return null;
}

export function findOverlap<T extends GridItem>(items: readonly T[]): [T, T] | null {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (overlaps(items[i]!, items[j]!)) return [items[i]!, items[j]!];
    }
  }
  return null;
}

export function moveItem<T extends GridItem>(items: readonly T[], id: string, x: number, y: number): T[] | null {
  const item = items.find((i) => i.widgetId === id);
  if (!item) return null;
  const next = { ...item, x, y };
  if (!canPlace(items, next, id)) return null;
  return items.map((i) => (i.widgetId === id ? next : i));
}

export function resizeItem<T extends GridItem>(
  items: readonly T[],
  id: string,
  w: number,
  h: number,
  min: { w: number; h: number } = { w: 1, h: 1 },
): T[] | null {
  const item = items.find((i) => i.widgetId === id);
  if (!item) return null;
  if (w < min.w || h < min.h) return null;
  const next = { ...item, w, h };
  if (!canPlace(items, next, id)) return null;
  return items.map((i) => (i.widgetId === id ? next : i));
}

/** Clamp a target position so the rect stays inside the grid. */
export function clampPosition(rect: Rect, x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(GRID_COLS - rect.w, x)),
    y: Math.max(0, Math.min(GRID_ROWS - rect.h, y)),
  };
}

/**
 * Drive mode uses a fixed, large-tile arrangement instead of free placement:
 * 1 -> full, 2 -> 2x1, 3 -> 3x1, 4 -> 2x2, 5-6 -> 3x2.
 */
export function driveArrangement(count: number): Rect[] {
  const n = Math.max(0, Math.min(DRIVE_MAX_WIDGETS, count));
  if (n === 0) return [];
  const [cols, rows] = n === 1 ? [1, 1] : n === 2 ? [2, 1] : n === 3 ? [3, 1] : n === 4 ? [2, 2] : [3, 2];
  const w = GRID_COLS / cols;
  const h = GRID_ROWS / rows;
  const rects: Rect[] = [];
  for (let i = 0; i < n; i++) {
    rects.push({ x: (i % cols) * w, y: Math.floor(i / cols) * h, w, h });
  }
  return rects;
}

export function arrangeForDrive<T extends GridItem>(items: readonly T[]): T[] {
  const rects = driveArrangement(items.length);
  return items.slice(0, rects.length).map((it, i) => ({ ...it, ...rects[i]! }));
}

/** Stable reading order: top-to-bottom, left-to-right. */
export function readingOrder<T extends Rect>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.y - b.y || a.x - b.x);
}
