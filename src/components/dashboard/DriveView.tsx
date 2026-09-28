"use client";

import { useT } from "@/i18n/lite";
import { useRouter } from "next/navigation";
import { useRef, useState, type PointerEvent } from "react";
import type { RenderWidget } from "@/lib/layout/schema";
import { useDeviceHeartbeat, useServiceWorker, useWakeLock } from "@/lib/client/hooks";
import { useNow } from "@/lib/client/tick";
import { useWidgetData } from "./useWidgetData";
import { WidgetCell } from "./WidgetCell";

const SHIFTS = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
] as const;

const EXIT_HOLD_MS = 1000;

/** Anti burn-in: move the whole canvas by <= 1 px every 5 minutes (§17). */
export function pixelShift(now: number): { x: number; y: number } {
  const [x, y] = SHIFTS[Math.floor(now / 300_000) % SHIFTS.length]!;
  return { x, y };
}

export function isNight(now: number): boolean {
  const h = new Date(now).getHours();
  return h >= 20 || h < 6;
}

/**
 * Drive mode: read-only, max 6 large tiles, no animation, no scrolling, no
 * inputs. Exit only via long-press or two-finger tap (§14).
 */
export function DriveView({ widgets, isDevice }: { widgets: RenderWidget[]; isDevice: boolean }) {
  const t = useT("drive");
  const entries = useWidgetData(widgets, "drive", () => {
    window.location.replace(isDevice ? "/pair?revoked=1" : "/login?next=/dashboard");
  });
  useWakeLock(true);
  useServiceWorker(true);
  useDeviceHeartbeat(isDevice);
  const now = useNow(60_000);
  const shift = now == null ? { x: 0, y: 0 } : pixelShift(now);
  const night = now != null && isNight(now);

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);
  const router = useRouter();
  const exit = () => router.push("/dashboard");
  const startHold = (e: PointerEvent) => {
    e.preventDefault();
    setHolding(true);
    holdTimer.current = setTimeout(exit, EXIT_HOLD_MS);
  };
  const cancelHold = () => {
    setHolding(false);
    if (holdTimer.current) clearTimeout(holdTimer.current);
  };

  return (
    <main
      className="wc-drive fixed inset-0"
      data-mode="drive"
      data-night={night ? "true" : "false"}
      onTouchStart={(e) => {
        if (e.touches.length === 2) exit();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="wc-grid" style={{ transform: `translate(${shift.x}px, ${shift.y}px)` }}>
        {widgets.map((w) => (
          <WidgetCell key={w.widgetId} widget={w} mode="drive" entries={entries} />
        ))}
      </div>
      <button
        type="button"
        className="absolute bottom-2 left-2 min-h-12 min-w-12 rounded-xl px-3 text-xs text-dim border border-border bg-bg/60"
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        aria-label={t("exitHint")}
        data-drive-exit
      >
        {holding ? t("exitHolding") : t("exitHint")}
      </button>
    </main>
  );
}
