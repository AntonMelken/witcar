import type { Metadata } from "next";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { LiteIntl } from "@/components/site/LiteIntl";
import { applyPlanForDisplay } from "@/lib/layout/schema";
import { DEMO_LAYOUT } from "@/lib/layout/fixtures";

export const metadata: Metadata = { title: "Demo" };

/** Public demo dashboard (fixture layout). Also used for viewport E2E tests. */
export default function DemoPage() {
  const widgets = applyPlanForDisplay(DEMO_LAYOUT, "pro", "standard");
  return (
    <LiteIntl namespaces={["widgets", "dashboard", "drive"]}>
      <DashboardView widgets={widgets} isDevice={false} demo />
    </LiteIntl>
  );
}
