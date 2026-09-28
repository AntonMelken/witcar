import { Clock, CloudSun, LineChart, QrCode, ShieldCheck, WifiOff } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDevicePrincipal } from "@/lib/auth/session";

/** Stylized dashboard preview (pure CSS, no vehicle imagery, §13). */
function PreviewMock() {
  const tile = "rounded-2xl border border-border bg-surface p-4 flex flex-col justify-between";
  return (
    <div
      className="grid grid-cols-3 grid-rows-2 gap-3 aspect-[16/10] w-full rounded-3xl border border-border bg-bg p-3"
      aria-hidden="true"
    >
      <div className={`${tile} row-span-2`}>
        <span className="text-dim text-xs">Uhrzeit</span>
        <span className="text-4xl font-semibold tabular">14:32</span>
        <span className="text-dim text-xs">Montag, 28. September</span>
      </div>
      <div className={tile}>
        <span className="text-dim text-xs">Berlin</span>
        <span className="text-3xl font-semibold tabular">18°</span>
      </div>
      <div className={tile}>
        <span className="text-dim text-xs">AAPL</span>
        <span className="text-2xl font-semibold tabular">231,40</span>
        <span className="text-positive text-xs tabular">▲ +1,24 %</span>
      </div>
      <div className={`${tile} col-span-2`}>
        <span className="text-dim text-xs">Timer</span>
        <span className="text-3xl font-semibold tabular">12:40</span>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  // A paired car goes straight to its dashboard.
  if (await getDevicePrincipal()) redirect("/dashboard");
  const t = await getTranslations("landing");
  const features = [
    { Icon: Clock, title: t("f1Title"), text: t("f1Text") },
    { Icon: QrCode, title: t("f2Title"), text: t("f2Text") },
    { Icon: WifiOff, title: t("f3Title"), text: t("f3Text") },
    { Icon: CloudSun, title: t("f4Title"), text: t("f4Text") },
    { Icon: LineChart, title: t("f5Title"), text: t("f5Text") },
    { Icon: ShieldCheck, title: t("f6Title"), text: t("f6Text") },
  ];
  return (
    <main>
      <section className="mx-auto max-w-5xl px-5 pt-14 pb-10 grid gap-10 md:grid-cols-2 items-center">
        <div className="space-y-6">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">{t("headline")}</h1>
          <p className="text-lg text-dim leading-relaxed">{t("subline")}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="btn btn-primary">
              {t("ctaStart")}
            </Link>
            <Link href="/pair" className="btn">
              {t("ctaCar")}
            </Link>
            <Link href="/demo" className="btn btn-ghost">
              {t("ctaDemo")}
            </Link>
          </div>
          <p className="text-sm text-dim">{t("positioning")}</p>
        </div>
        <PreviewMock />
      </section>

      <section className="mx-auto max-w-5xl px-5 py-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ Icon, title, text }) => (
          <div key={title} className="card p-6 space-y-2">
            <Icon aria-hidden="true" className="text-accent" size={26} />
            <h2 className="font-semibold text-lg">{title}</h2>
            <p className="text-dim text-sm leading-relaxed">{text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="card p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">{t("pricingTitle")}</h2>
            <p className="text-dim">{t("pricingText")}</p>
          </div>
          <Link href="/pricing" className="btn btn-primary">
            {t("pricingCta")}
          </Link>
        </div>
      </section>
    </main>
  );
}
