"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { useT } from "@/i18n/lite";
import type { RenderWidget } from "@/lib/layout/schema";
import type { DashboardData } from "@/lib/client/useDashboardData";
import { widgetApps } from "@/widgets/apps";
import { getWidgetBaseMeta, isActiveWidgetType } from "@/widgets/meta";
import type { SaveState } from "@/widgets/types";
import { AppShell } from "./AppShell";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";

/** Opens the app of a widget inside the full-screen shell. */
export function AppHost({
  widget,
  data,
  demo,
  saveState,
  setConfig,
  onClose,
}: {
  widget: RenderWidget;
  data: DashboardData;
  demo: boolean;
  saveState: SaveState;
  setConfig: (config: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const t = useT("widgets");
  const td = useT("dashboard");
  const App = isActiveWidgetType(widget.type) ? widgetApps[widget.type] : undefined;
  const extra = useRef<(() => Promise<unknown>) | null>(null);
  const [busy, setBusy] = useState(false);
  const registerRefresh = useCallback((fn: (() => Promise<unknown>) | null) => {
    extra.current = fn;
  }, []);
  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const [ok] = await Promise.all([data.refresh(), extra.current?.()]);
      return ok;
    } finally {
      setBusy(false);
    }
  }, [data]);
  if (!App) return null;
  const title = t(getWidgetBaseMeta(widget.type)?.title ?? "locked");
  return (
    <AppShell
      title={title}
      onClose={onClose}
      onRefresh={() => void refresh()}
      refreshing={busy || data.refreshing}
      updatedAt={data.updatedAt}
      failed={data.failed}
      saveState={saveState}
    >
      <WidgetErrorBoundary fallback={<p className="text-dim">{t("crashed")}</p>}>
        <Suspense fallback={<p className="text-dim">{td("loadingApp")}</p>}>
          <App
            instanceId={widget.widgetId}
            config={widget.config}
            data={data.entries}
            setConfig={setConfig}
            saveState={saveState}
            demo={demo}
            refresh={refresh}
            refreshing={busy || data.refreshing}
            registerRefresh={registerRefresh}
            close={onClose}
          />
        </Suspense>
      </WidgetErrorBoundary>
    </AppShell>
  );
}
