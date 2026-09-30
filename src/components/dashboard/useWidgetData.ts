"use client";

import { useMemo } from "react";
import type { RenderWidget } from "@/lib/layout/schema";
import { useDashboardData, type DashboardData } from "@/lib/client/useDashboardData";
import { getWidgetBaseMeta, widgetDataRequests } from "@/widgets/meta";
import type { DashboardMode, DataRequest } from "@/widgets/types";

export function useWidgetData(
  widgets: RenderWidget[],
  mode: DashboardMode,
  onUnauthorized?: () => void,
): DashboardData {
  const { requests, refreshMs } = useMemo(() => {
    const reqs: DataRequest[] = [];
    let min = Infinity;
    for (const w of widgets) {
      if (w.locked) continue;
      const r = widgetDataRequests(w.type, w.config, mode);
      if (r.length > 0) {
        reqs.push(...r);
        min = Math.min(min, getWidgetBaseMeta(w.type)?.refreshMs ?? Infinity);
      }
    }
    return { requests: reqs, refreshMs: Number.isFinite(min) ? min : 60_000 };
  }, [widgets, mode]);
  return useDashboardData(requests, { refreshMs, onUnauthorized });
}
