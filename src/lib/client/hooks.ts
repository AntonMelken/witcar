"use client";

import { useEffect, useRef } from "react";

/** Screen Wake Lock if available; failures are ignored silently (§14). */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        // not allowed / not supported: ignore
      }
    };
    const onVisible = () => {
      if (!document.hidden && !cancelled) void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => undefined);
    };
  }, [enabled]);
}

/**
 * Checks the device session every 20 s so a revoked device leaves the
 * dashboard within 30 s (Phase 3 acceptance).
 */
export function useDeviceHeartbeat(enabled: boolean, intervalMs = 20_000) {
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const beat = async () => {
      if (stopped || document.hidden) return;
      try {
        const res = await fetch("/api/device/heartbeat", { cache: "no-store" });
        if (res.status === 401) window.location.replace("/pair?revoked=1");
      } catch {
        // offline: keep showing stale data
      }
    };
    const id = setInterval(beat, intervalMs);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [enabled, intervalMs]);
}

/** Registers the service worker and reloads on a new version while idle (§14). */
export function useServiceWorker(autoReload: boolean) {
  const lastInteraction = useRef(0);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    lastInteraction.current = Date.now();
    const mark = () => {
      lastInteraction.current = Date.now();
    };
    window.addEventListener("pointerdown", mark, { passive: true });
    window.addEventListener("keydown", mark);

    let updateReady = false;
    let reloadTimer: ReturnType<typeof setInterval> | null = null;
    const hadController = !!navigator.serviceWorker.controller;

    const precacheCurrentPage = (reg: ServiceWorkerRegistration) => {
      const urls = performance
        .getEntriesByType("resource")
        .map((e) => e.name)
        .filter((u) => u.startsWith(location.origin) && /\/_next\/static\/|\/fonts\/|\/icons\//.test(u));
      const target = navigator.serviceWorker.controller ?? reg.active;
      target?.postMessage({ type: "PRECACHE", page: location.pathname + location.search, urls });
    };

    const onControllerChange = () => {
      if (hadController) updateReady = true;
    };
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "PRECACHED") document.documentElement.dataset.swReady = "1";
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    navigator.serviceWorker.addEventListener("message", onMessage);

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(async (reg) => {
        await navigator.serviceWorker.ready;
        precacheCurrentPage(reg);
        const updater = setInterval(() => void reg.update().catch(() => undefined), 30 * 60_000);
        reloadTimer = setInterval(() => {
          // never reload while the user is interacting
          if (autoReload && updateReady && Date.now() - lastInteraction.current > 60_000) location.reload();
        }, 15_000);
        return () => clearInterval(updater);
      })
      .catch(() => undefined);

    return () => {
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      navigator.serviceWorker.removeEventListener("message", onMessage);
      if (reloadTimer) clearInterval(reloadTimer);
    };
  }, [autoReload]);
}
