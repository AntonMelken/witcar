import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { IntlProvider } from "@/components/site/IntlProvider";
import { getUserSession } from "@/lib/auth/session";
import { getDisplayPrices } from "@/lib/billing/prices";
import { isBillingConfigured } from "@/lib/billing/stripe";
import { PLAN_LIMITS } from "@/lib/plan";

export const metadata: Metadata = { title: "Preise" };

export default async function PricingPage(props: PageProps<"/pricing">) {
  const t = await getTranslations("pricing");
  const sp = await props.searchParams;
  const [user, prices] = await Promise.all([getUserSession(), getDisplayPrices()]);
  const monthly = prices.find((p) => p.interval === "monthly");
  const yearly = prices.find((p) => p.interval === "yearly");
  const free = PLAN_LIMITS.free;
  const pro = PLAN_LIMITS.pro;
  const rows = [
    [t("rowWidgets"), String(free.widgetsPerLayout), t("all")],
    [t("rowLayouts"), String(free.standardLayouts), t("multiple")],
    [t("rowTickers"), String(free.tickersPerWidget), t("upTo", { n: pro.tickersPerWidget })],
    [t("rowDevices"), String(free.devices), String(pro.devices)],
    [t("rowNotes"), "—", "✓"],
  ];
  return (
    <main className="mx-auto max-w-5xl px-5 py-12 space-y-10">
      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-dim text-lg">{t("subtitle")}</p>
        {sp.checkout === "cancelled" ? <p className="text-warning">{t("cancelled")}</p> : null}
      </header>
      <div className="grid gap-5 md:grid-cols-2">
        <section className="card p-7 space-y-4">
          <h2 className="text-2xl font-semibold">Free</h2>
          <p className="text-3xl font-bold tabular">0 €</p>
          <ul className="space-y-2">
            {rows.map(([label, f]) => (
              <li key={label} className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-dim">{label}</span>
                <span className="font-medium">{f}</span>
              </li>
            ))}
          </ul>
          <Link href="/login" className="btn w-full">
            {t("startFree")}
          </Link>
        </section>
        <section className="card p-7 space-y-4 border-accent">
          <h2 className="text-2xl font-semibold">Pro</h2>
          <p className="text-3xl font-bold tabular">
            {monthly ? t("perMonth", { amount: monthly.amount }) : t("priceTbd")}
          </p>
          {yearly ? <p className="text-dim">{t("orYearly", { amount: yearly.amount })}</p> : null}
          <ul className="space-y-2">
            {rows.map(([label, , p]) => (
              <li key={label} className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-dim">{label}</span>
                <span className="font-medium inline-flex items-center gap-1">
                  <Check size={16} aria-hidden="true" className="text-accent" />
                  {p}
                </span>
              </li>
            ))}
          </ul>
          {user ? (
            <IntlProvider namespaces={["billing"]}>
              <CheckoutButton configured={isBillingConfigured()} hasYearly={!!yearly} />
            </IntlProvider>
          ) : (
            <Link href="/login?next=/pricing" className="btn btn-primary w-full">
              {t("loginToUpgrade")}
            </Link>
          )}
          <p className="text-xs text-dim">{t("taxNote")}</p>
        </section>
      </div>
    </main>
  );
}
