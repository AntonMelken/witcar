import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { LiteIntl } from "@/components/site/LiteIntl";
import { requirePrincipalPage } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { arrangeForDrive, DRIVE_MAX_WIDGETS, readingOrder } from "@/lib/layout/grid";
import { applyPlanForDisplay } from "@/lib/layout/schema";
import { getDefaultLayout } from "@/lib/repo/layouts";
import { ensureProfile } from "@/lib/repo/profiles";
import { getUserPlan } from "@/lib/services/plan";
import { getWidgetMeta } from "@/widgets/registry";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

const NAMESPACES = ["widgets", "dashboard", "drive"] as const;

// Drive mode code is only downloaded in drive mode (/dashboard initial JS budget, §17).
const DriveView = dynamic(() => import("@/components/dashboard/DriveView").then((m) => m.DriveView));
const DriveSafetyGate = dynamic(() => import("@/components/dashboard/DriveSafetyGate").then((m) => m.DriveSafetyGate));

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const sp = await props.searchParams;
  const mode = sp.mode === "drive" ? "drive" : "standard";
  const principal = await requirePrincipalPage(mode === "drive" ? "/dashboard?mode=drive" : "/dashboard");
  const isDevice = principal.kind === "device";
  const db = await getDb();
  const [profile, { plan }] = await Promise.all([
    ensureProfile(db, principal.userId),
    getUserPlan(db, principal.userId),
  ]);
  const t = await getTranslations("dashboard");

  if (mode === "drive") {
    if (!profile.safetyAckAt) {
      return (
        <LiteIntl namespaces={NAMESPACES}>
          <DriveSafetyGate />
        </LiteIntl>
      );
    }
    // Saved drive layout, or derived from the standard layout (driveSafe only, max 4 recommended)
    const driveLayout = await getDefaultLayout(db, principal.userId, "drive");
    let source = driveLayout?.widgets ?? [];
    if (!driveLayout) {
      const standard = await getDefaultLayout(db, principal.userId, "standard");
      source = readingOrder(standard?.widgets ?? [])
        .filter((w) => getWidgetMeta(w.type)?.driveSafe)
        .slice(0, 4);
    }
    const visible = applyPlanForDisplay(source, plan, "drive").filter((w) => !w.locked);
    const widgets = arrangeForDrive(visible.slice(0, DRIVE_MAX_WIDGETS));
    return (
      <LiteIntl namespaces={NAMESPACES}>
        <DriveView widgets={widgets} isDevice={isDevice} />
      </LiteIntl>
    );
  }

  const layout = await getDefaultLayout(db, principal.userId, "standard");
  if (!layout && principal.kind === "user" && !profile.onboardedAt) redirect("/onboarding");
  const widgets = layout ? applyPlanForDisplay(layout.widgets, plan, "standard") : [];

  return (
    <LiteIntl namespaces={NAMESPACES}>
      <DashboardView widgets={widgets} isDevice={isDevice} emptyHint={t("empty")} layoutId={layout?.id ?? null} />
    </LiteIntl>
  );
}
