import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AccountPanel, AppearancePanel, BillingPanel, DevicesPanel } from "@/components/settings/Panels";
import { IntlProvider } from "@/components/site/IntlProvider";
import { Logo } from "@/components/site/Logo";
import { requireUserPage } from "@/lib/auth/session";
import { isBillingConfigured } from "@/lib/billing/stripe";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { PLAN_LIMITS } from "@/lib/plan";
import { listDevices } from "@/lib/repo/devices";
import { ensureProfile } from "@/lib/repo/profiles";
import { getUserPlan } from "@/lib/services/plan";

export const metadata: Metadata = { title: "Einstellungen", robots: { index: false } };

export default async function SettingsPage(props: PageProps<"/settings">) {
  const user = await requireUserPage("/settings");
  const sp = await props.searchParams;
  const db = await getDb();
  const [profile, { plan, subscription }, devices] = await Promise.all([
    ensureProfile(db, user.userId),
    getUserPlan(db, user.userId),
    listDevices(db, user.userId),
  ]);
  const t = await getTranslations("settings");
  return (
    <main className="mx-auto max-w-3xl p-5 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <Link href="/dashboard" className="text-text">
          <Logo />
        </Link>
        <Link href="/dashboard" className="btn">
          {t("toDashboard")}
        </Link>
      </header>
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      {sp.checkout === "success" ? (
        <p className="rounded-xl border border-positive/50 bg-positive/10 p-4" role="status">
          {t("checkoutSuccess")}
        </p>
      ) : null}
      <IntlProvider namespaces={["settings", "presets"]}>
        <AppearancePanel theme={profile.theme} preset={profile.vehiclePreset} />
        <DevicesPanel devices={devices} max={PLAN_LIMITS[plan].devices} />
        <BillingPanel
          plan={plan}
          status={subscription?.status ?? "inactive"}
          periodEnd={subscription?.currentPeriodEnd ?? null}
          cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd ?? false}
          hasCustomer={!!subscription?.stripeCustomerId}
          billingConfigured={isBillingConfigured()}
          openAccess={getEnv().WITCAR_OPEN_ACCESS}
        />
        <AccountPanel name={profile.displayName ?? user.name ?? user.email} />
      </IntlProvider>
    </main>
  );
}
