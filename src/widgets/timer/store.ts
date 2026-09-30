"use client";

import { useCallback, useSyncExternalStore } from "react";
import { IDLE, type TimerState } from "./logic";

/**
 * Timer state per widget instance, shared by the widget and its app and kept
 * across reloads (localStorage; in memory when storage is unavailable).
 */
const key = (id: string) => `wc:timer:${id}`;
const memory = new Map<string, string>();
const listeners = new Map<string, Set<() => void>>();
const cache = new Map<string, { raw: string | null; state: TimerState }>();

function valid(v: unknown): v is TimerState {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    s.status === "idle" ||
    (s.status === "running" && typeof s.endsAt === "number") ||
    (s.status === "paused" && typeof s.remainingMs === "number")
  );
}

function readRaw(id: string): string | null {
  if (memory.has(id)) return memory.get(id) ?? null;
  try {
    return window.localStorage.getItem(key(id));
  } catch {
    return null;
  }
}

function snapshot(id: string): TimerState {
  const raw = readRaw(id);
  const hit = cache.get(id);
  if (hit && hit.raw === raw) return hit.state;
  let state = IDLE;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (valid(parsed)) state = parsed;
    } catch {
      // damaged value: start idle
    }
  }
  cache.set(id, { raw, state });
  return state;
}

function subscribe(id: string, listener: () => void): () => void {
  let set = listeners.get(id);
  if (!set) listeners.set(id, (set = new Set()));
  set.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === key(id)) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    set.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTimer(instanceId: string): [TimerState, (next: TimerState) => void] {
  const state = useSyncExternalStore(
    useCallback((l: () => void) => subscribe(instanceId, l), [instanceId]),
    () => snapshot(instanceId),
    () => IDLE,
  );
  const set = useCallback(
    (next: TimerState) => {
      const raw = JSON.stringify(next);
      memory.set(instanceId, raw);
      try {
        window.localStorage.setItem(key(instanceId), raw);
      } catch {
        // storage unavailable: the in-memory copy still works for this tab
      }
      for (const l of listeners.get(instanceId) ?? []) l();
    },
    [instanceId],
  );
  return [state, set];
}
