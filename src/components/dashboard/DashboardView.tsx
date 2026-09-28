"use client";

import { useT } from "@/i18n/lite";
import Link from "next/link";
import type { RenderWidget } from "@/lib/layout/schema";
import { useDeviceHeartbeat, useServiceWorker } from "@/lib/client/hooks";
import { Icon } from "./icons";
import { useWidgetData } from "./useWidgetData";
import { WidgetCell } from "./WidgetCell";

export function DashboardView({
  widgets,
  isDevice,
  demo = false,
  emptyHint,
}: {
  widgets: RenderWidget[];
  isDevice: boolean;
  demo?: boolean;
  emptyHint?: string;
}) {
  const t = useT("dashboard");
  const entries = useWidgetData(widgets, "standard", () => {
    if (!demo) window.location.replace(isDevice ? "/pair?revoked=1" : "/login?next=/dashboard");
  });
  useServiceWorker(true);
  useDeviceHeartbeat(isDevice);

  return (
    <main className="relative" data-mode="standard">
      <div className="wc-grid">
        {widgets.map((w) => (
          <WidgetCell key={w.widgetId} widget={w} mode="standard" entries={entries} />
        ))}
      </div>
      {widgets.length === 0 && emptyHint ? (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-dim">{emptyHint}</div>
      ) : null}
      <nav
        className="fixed bottom-3 right-3 flex gap-2 rounded-2xl border border-border bg-surface/90 p-1.5"
        aria-label={t("toolbar")}
      >
        {demo ? (
          <Link href="/login" className="btn btn-primary">
            {t("startFree")}
          </Link>
        ) : (
          <>
            <Link href="/editor" className="btn btn-ghost" aria-label={t("edit")} title={t("edit")}>
              <Icon name="pencil" />
            </Link>
            <Link
              href="/dashboard?mode=drive"
              className="btn btn-ghost"
              aria-label={t("driveMode")}
              title={t("driveMode")}
            >
              <Icon name="gauge" />
            </Link>
            {!isDevice ? (
              <Link href="/settings" className="btn btn-ghost" aria-label={t("settings")} title={t("settings")}>
                <Icon name="settings" />
              </Link>
            ) : null}
          </>
        )}
      </nav>
    </main>
  );
}
