"use client";

import { useT } from "@/i18n/lite";
import { lazy, Suspense, useCallback, useState } from "react";
import type { RenderWidget } from "@/lib/layout/schema";
import { formatTime } from "@/lib/client/format";
import { useDeviceHeartbeat, useServiceWorker } from "@/lib/client/hooks";
import { Icon } from "./icons";
import { useLiveWidgets } from "./useLiveWidgets";
import { useWidgetData } from "./useWidgetData";
import { WidgetCell } from "./WidgetCell";

// Plain links on purpose: next/link would add its client code to the dashboard bundle (§17 budget).
// the app frame and the apps load when a widget is tapped
const AppHost = lazy(() => import("./AppHost").then((m) => ({ default: m.AppHost })));

export function DashboardView({
  widgets: initialWidgets,
  isDevice,
  demo = false,
  emptyHint,
  layoutId = null,
}: {
  widgets: RenderWidget[];
  isDevice: boolean;
  demo?: boolean;
  emptyHint?: string;
  /** layout the widgets belong to; config changes made in apps are saved there (not on the demo) */
  layoutId?: string | null;
}) {
  const t = useT("dashboard");
  const onUnauthorized = useCallback(() => {
    if (!demo) window.location.replace(isDevice ? "/pair?revoked=1" : "/login?next=/dashboard");
  }, [demo, isDevice]);
  const { widgets, setConfig, saveState, flush } = useLiveWidgets(
    initialWidgets,
    demo ? null : layoutId,
    onUnauthorized,
  );
  const data = useWidgetData(widgets, "standard", onUnauthorized);
  const [openId, setOpenId] = useState<string | null>(null);
  const openWidget = widgets.find((w) => w.widgetId === openId) ?? null;
  useServiceWorker(true);
  useDeviceHeartbeat(isDevice);

  return (
    <main className="relative" data-mode="standard">
      <div className="wc-grid" inert={openWidget ? true : undefined}>
        {widgets.map((w) => (
          <WidgetCell
            key={w.widgetId}
            widget={w}
            mode="standard"
            entries={data.entries}
            onOpen={() => setOpenId(w.widgetId)}
          />
        ))}
      </div>
      {openWidget ? (
        <Suspense fallback={null}>
          <AppHost
            widget={openWidget}
            data={data}
            demo={demo}
            saveState={saveState}
            setConfig={(config) => setConfig(openWidget.widgetId, config)}
            onClose={() => {
              flush();
              setOpenId(null);
            }}
          />
        </Suspense>
      ) : null}
      {widgets.length === 0 && emptyHint ? (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-dim">{emptyHint}</div>
      ) : null}
      <nav
        className="fixed bottom-3 right-3 flex items-center gap-2 rounded-2xl border border-border bg-surface/90 p-1.5"
        aria-label={t("toolbar")}
      >
        <span className="hidden items-center px-2 text-xs md:flex" aria-live="polite" data-testid="updated">
          {data.failed ? (
            <span className="text-warning">{t("refreshFailed")}</span>
          ) : data.updatedAt ? (
            <span className="tabular text-dim">
              {t("updatedAt", { time: formatTime(new Date(data.updatedAt), { seconds: false }) })}
            </span>
          ) : null}
        </span>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => void data.refresh()}
          disabled={data.refreshing}
          aria-label={t("refresh")}
          title={t("refresh")}
          data-testid="refresh"
        >
          <span className={data.refreshing ? "wc-spin inline-flex" : "inline-flex"}>
            <Icon name="refresh" />
          </span>
        </button>
        {demo ? (
          <a href="/login" className="btn btn-primary">
            {t("startFree")}
          </a>
        ) : (
          <>
            <a href="/editor" className="btn btn-ghost" aria-label={t("edit")} title={t("edit")}>
              <Icon name="pencil" />
            </a>
            <a
              href="/dashboard?mode=drive"
              className="btn btn-ghost"
              aria-label={t("driveMode")}
              title={t("driveMode")}
            >
              <Icon name="gauge" />
            </a>
            {!isDevice ? (
              <a href="/settings" className="btn btn-ghost" aria-label={t("settings")} title={t("settings")}>
                <Icon name="settings" />
              </a>
            ) : null}
          </>
        )}
      </nav>
    </main>
  );
}
