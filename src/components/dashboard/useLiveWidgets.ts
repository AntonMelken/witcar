"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RenderWidget } from "@/lib/layout/schema";
import type { SaveState } from "@/widgets/types";

const DEBOUNCE_MS = 700;
const SAVED_VISIBLE_MS = 2000;

/**
 * Widgets as shown on the dashboard plus saving of config changes made in the
 * widget apps: the change is applied at once (optimistic), then saved to the
 * layout after a short pause. Without a layout id (public demo) changes only
 * live in this tab.
 */
export function useLiveWidgets(initial: RenderWidget[], layoutId: string | null, onUnauthorized?: () => void) {
  const [widgets, setWidgets] = useState(initial);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const pending = useRef(new Map<string, Record<string, unknown>>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const unauthorized = useRef(onUnauthorized);
  useEffect(() => {
    unauthorized.current = onUnauthorized;
  });

  const send = useCallback(
    (keepalive: boolean) => {
      if (!layoutId || pending.current.size === 0) return;
      const batch = [...pending.current.entries()];
      pending.current.clear();
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      setSaveState("saving");
      // one request at a time: the last config of a widget must win on the server
      chain.current = chain.current.then(async () => {
        let failed = false;
        for (const [widgetId, config] of batch) {
          try {
            const res = await fetch(`/api/layouts/${layoutId}/widgets/${encodeURIComponent(widgetId)}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ config }),
              keepalive,
            });
            if (res.status === 401) unauthorized.current?.();
            if (!res.ok) failed = true;
          } catch {
            failed = true;
          }
        }
        if (pending.current.size > 0) return; // newer changes are queued: they set the state
        setSaveState(failed ? "error" : "saved");
        if (idle.current) clearTimeout(idle.current);
        if (!failed) idle.current = setTimeout(() => setSaveState("idle"), SAVED_VISIBLE_MS);
      });
    },
    [layoutId],
  );

  const setConfig = useCallback(
    (widgetId: string, config: Record<string, unknown>) => {
      setWidgets((prev) => prev.map((w) => (w.widgetId === widgetId ? { ...w, config } : w)));
      if (!layoutId) return;
      pending.current.set(widgetId, config);
      if (idle.current) clearTimeout(idle.current);
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => send(false), DEBOUNCE_MS);
    },
    [layoutId, send],
  );

  const flush = useCallback(() => send(false), [send]);

  // do not lose the last edit when the tab is closed or hidden
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") send(true);
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      if (timer.current) clearTimeout(timer.current);
      if (idle.current) clearTimeout(idle.current);
    };
  }, [send]);

  return { widgets, setConfig, saveState, flush };
}
