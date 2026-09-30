"use client";

import { useT } from "@/i18n/lite";
import { Suspense, type CSSProperties } from "react";
import type { RenderWidget } from "@/lib/layout/schema";
import { hasWidgetApp } from "@/widgets/apps";
import { widgetComponents } from "@/widgets/components";
import { getWidgetBaseMeta, isActiveWidgetType } from "@/widgets/meta";
import type { DashboardMode, DataEntry } from "@/widgets/types";
import { Icon } from "./icons";
import { Tile } from "./Tile";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";

export function cellStyle(w: { x: number; y: number; w: number; h: number }): CSSProperties {
  return { "--x": w.x + 1, "--y": w.y + 1, "--w": w.w, "--h": w.h } as CSSProperties;
}

export function WidgetCell({
  widget,
  mode,
  entries,
  onOpen,
}: {
  widget: RenderWidget;
  mode: DashboardMode;
  entries: Record<string, DataEntry>;
  /** standard mode only: tapping the widget opens its app */
  onOpen?: () => void;
}) {
  const t = useT("widgets");
  const Comp = isActiveWidgetType(widget.type) ? widgetComponents[widget.type] : null;
  const canOpen = !!onOpen && mode === "standard" && !widget.locked && !!Comp && hasWidgetApp(widget.type);
  const appName = t(getWidgetBaseMeta(widget.type)?.title ?? "locked");
  return (
    <div className="wc-cell" style={cellStyle(widget)} data-widget={widget.type} data-widget-id={widget.widgetId}>
      {widget.locked || !Comp ? (
        <Tile>
          <div className="flex flex-col items-center justify-center gap-2 text-dim text-center" data-locked="true">
            <Icon name="lock" size={22} />
            <span className="text-sm">{t("locked")}</span>
          </div>
        </Tile>
      ) : (
        <WidgetErrorBoundary
          fallback={
            <Tile>
              <p className="text-dim text-sm">{t("crashed")}</p>
            </Tile>
          }
        >
          <Suspense fallback={<Tile>{null}</Tile>}>
            <Comp
              instanceId={widget.widgetId}
              config={widget.config as never}
              mode={mode}
              data={entries}
              size={{ w: widget.w, h: widget.h }}
            />
          </Suspense>
        </WidgetErrorBoundary>
      )}
      {canOpen ? (
        // stretched button over the whole tile; controls inside a widget sit above it (.wc-interactive)
        <button type="button" className="wc-open" onClick={onOpen} aria-label={t("openApp", { name: appName })}>
          <Icon name="expand" size={16} />
        </button>
      ) : null}
    </div>
  );
}
