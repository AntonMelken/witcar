/** Undo/redo history (>= 20 steps required, we keep 50). Pure & immutable. */
export const HISTORY_LIMIT = 50;

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  /** consecutive pushes with the same key are merged (e.g. typing) */
  lastKey: string | null;
}

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], lastKey: null };
}

export function push<T>(h: History<T>, next: T, coalesceKey: string | null = null): History<T> {
  if (Object.is(next, h.present)) return h;
  if (coalesceKey && coalesceKey === h.lastKey) {
    return { ...h, present: next, future: [] };
  }
  return {
    past: [...h.past, h.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
    lastKey: coalesceKey,
  };
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h;
  const previous = h.past[h.past.length - 1]!;
  return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future], lastKey: null };
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h;
  const [next, ...rest] = h.future;
  return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next!, future: rest, lastKey: null };
}

/** Replace present without recording (e.g. rollback to last saved state). */
export function replace<T>(h: History<T>, present: T): History<T> {
  return { ...h, present, lastKey: null };
}
