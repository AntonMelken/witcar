import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { LiteIntl } from "@/components/site/LiteIntl";
import { applyPlanForDisplay, type LayoutWidget } from "@/lib/layout/schema";
import { DEMO_LAYOUT } from "@/lib/layout/fixtures";
import { unavailableWidgetTypes } from "@/lib/providers/availability";
import { fxMeta } from "@/widgets/fx/definition";

export const metadata: Metadata = { title: "Demo" };

/** Public demo dashboard (fixture layout). Also used for viewport E2E tests. */
export default function DemoPage() {
  const unavailable = unavailableWidgetTypes();
  // without a licensed stock source the demo shows ECB exchange rates instead
  const layout: LayoutWidget[] = DEMO_LAYOUT.map((w) =>
    unavailable.includes(w.type) && w.type === "stocks"
      ? { ...w, widgetId: "demo-fx", type: "fx", config: fxMeta.defaultConfig }
      : w,
  );
  const widgets = applyPlanForDisplay(layout, "pro", "standard");
  return (
    <LiteIntl namespaces={["widgets", "dashboard", "drive"]}>
      <DashboardView widgets={widgets} isDevice={false} demo />
    </LiteIntl>
  );
}
