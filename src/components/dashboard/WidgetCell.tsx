"use client";

import { useT } from "@/i18n/lite";
import type { CSSProperties } from "react";
import type { RenderWidget } from "@/lib/layout/schema";
import { widgetComponents } from "@/widgets/components";
import { isActiveWidgetType } from "@/widgets/meta";
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
}: {
  widget: RenderWidget;
  mode: DashboardMode;
  entries: Record<string, DataEntry>;
}) {
  const t = useT("widgets");
  const Comp = isActiveWidgetType(widget.type) ? widgetComponents[widget.type] : null;
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
          <Comp
            instanceId={widget.widgetId}
            config={widget.config as never}
            mode={mode}
            data={entries}
            size={{ w: widget.w, h: widget.h }}
          />
        </WidgetErrorBoundary>
      )}
    </div>
  );
}
