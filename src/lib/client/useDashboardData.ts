"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { dataKey, type DataEntry, type DataRequest, type ProviderResult } from "@/widgets/types";
import { readJson, writeJson } from "./storage";

const STORE_KEY = "wc:data:v1";
const MIN_INTERVAL_MS = 60_000;
const MAX_BACKOFF_MS = 5 * 60_000;

type Stored = Record<string, ProviderResult>;

export function nextDelay(baseMs: number, failures: number, random = Math.random): number {
  const base =
    failures > 0 ? Math.min(MAX_BACKOFF_MS, 10_000 * 2 ** (failures - 1)) : Math.max(MIN_INTERVAL_MS, baseMs);
  const jitter = 1 + (random() * 0.2 - 0.1); // ±10 %
  return Math.round(base * jitter);
}

interface Options {
  refreshMs: number;
  onUnauthorized?: () => void;
  endpoint?: string;
}

/**
 * Bundles all widget data into ONE request (POST /api/widgets/batch),
 * pauses while hidden, backs off exponentially on errors, and keeps the last
 * known data in localStorage for offline starts (masterplan §11.4, §17).
 */
export function useDashboardData(requests: DataRequest[], opts: Options): Record<string, DataEntry> {
  const unique = useMemo(() => {
    const map = new Map<string, DataRequest>();
    for (const r of requests) map.set(dataKey(r), r);
    return [...map.values()];
  }, [requests]);
  const signature = unique.map(dataKey).sort().join("|");
  const [entries, setEntries] = useState<Record<string, DataEntry>>({});
  const onUnauthorized = useRef(opts.onUnauthorized);
  useEffect(() => {
    onUnauthorized.current = opts.onUnauthorized;
  });

  useEffect(() => {
    if (unique.length === 0) return;
    const stored = readJson<Stored>(STORE_KEY) ?? {};
    const initial: Record<string, DataEntry> = {};
    for (const r of unique) {
      const k = dataKey(r);
      if (stored[k]) initial[k] = { result: stored[k]!, error: null };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate last known data from localStorage (offline start)
    setEntries((prev) => ({ ...initial, ...prev }));

    let stopped = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastRun = 0;
    let controller: AbortController | null = null;

    const schedule = (delay: number) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, delay);
    };

    async function run() {
      if (stopped) return;
      if (document.hidden) return; // resumes on visibilitychange
      lastRun = Date.now();
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await fetch(opts.endpoint ?? "/api/widgets/batch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ requests: unique }),
          cache: "no-store",
          signal: controller.signal,
        });
        if (res.status === 401) {
          onUnauthorized.current?.();
          return;
        }
        if (!res.ok) throw new Error(`batch ${res.status}`);
        const body = (await res.json()) as {
          results: Record<string, ProviderResult | { error: { code: string } }>;
        };
        failures = 0;
        // persist outside the state updater: React may run updaters lazily
        const persisted = readJson<Stored>(STORE_KEY) ?? {};
        for (const [k, v] of Object.entries(body.results)) if (!("error" in v)) persisted[k] = v;
        setEntries((prev) => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(body.results)) {
            next[k] =
              "error" in v ? { result: prev[k]?.result ?? null, error: v.error.code } : { result: v, error: null };
          }
          return next;
        });
        const keys = Object.keys(persisted);
        if (keys.length > 100) for (const k of keys.slice(0, keys.length - 100)) delete persisted[k];
        writeJson(STORE_KEY, persisted);
      } catch (err) {
        if ((err as Error).name === "AbortError" && stopped) return;
        failures++;
        setEntries((prev) => {
          const next = { ...prev };
          for (const r of unique) {
            const k = dataKey(r);
            next[k] = { result: prev[k]?.result ?? null, error: "network" };
          }
          return next;
        });
      }
      if (!stopped) schedule(nextDelay(opts.refreshMs, failures));
    }

    const onVisible = () => {
      if (!document.hidden && Date.now() - lastRun > Math.max(MIN_INTERVAL_MS, opts.refreshMs)) schedule(0);
      else if (!document.hidden && !timer) schedule(nextDelay(opts.refreshMs, failures));
    };
    const onOnline = () => {
      failures = 0;
      schedule(0);
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    schedule(0);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
    // signature captures the request set; opts.refreshMs is a primitive
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, opts.refreshMs, opts.endpoint]);

  return entries;
}
