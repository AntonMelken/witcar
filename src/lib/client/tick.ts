import { useSyncExternalStore } from "react";

/**
 * One central 1 s tick for the whole dashboard instead of one setInterval per
 * widget (masterplan §17). Components subscribe with their own granularity
 * and only re-render when their bucket changes.
 */
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

function schedule() {
  const delay = 1000 - (Date.now() % 1000) + 10;
  timer = setTimeout(() => {
    for (const l of listeners) l();
    schedule();
  }, delay);
}

export function subscribeTick(listener: () => void): () => void {
  listeners.add(listener);
  if (!timer) schedule();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
}

export function listenerCount(): number {
  return listeners.size;
}

/** Current time floored to `granularityMs`; null during SSR/hydration. */
export function useNow(granularityMs = 1000): number | null {
  return useSyncExternalStore(
    subscribeTick,
    () => Math.floor(Date.now() / granularityMs) * granularityMs,
    () => null,
  );
}
