import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/LoginForm";
import { QuickStart } from "@/components/auth/QuickStart";
import { PairScreen } from "@/components/pairing/PairScreen";
import { IntlProvider } from "@/components/site/IntlProvider";
import { Logo } from "@/components/site/Logo";
import { isCarBrowser } from "@/lib/auth/carBrowser";
import { safeNext } from "@/lib/auth/redirect";
import { getDevicePrincipal, getUserSession } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Anmelden", robots: { index: false } };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  if (await getUserSession()) redirect(next);
  const t = await getTranslations("auth");
  const car = isCarBrowser((await headers()).get("user-agent"));
  // In the car: one-tap start first, then QR pairing with the phone, e-mail code last.
  const showPairing = car && !(await getDevicePrincipal());

  const emailCard = (
    <div className="card p-7 space-y-5">
      <h1 className={showPairing ? "text-xl font-bold" : "text-2xl font-bold"}>
        {showPairing ? t("carEmailTitle") : t("title")}
      </h1>
      <p className="text-dim">{car ? t("carSubtitle") : t("subtitle")}</p>
      {sp.error ? <p className="text-negative text-sm">{t("linkError")}</p> : null}
      <IntlProvider namespaces={["auth"]}>
        <LoginForm mode={getEnv().WITCAR_AUTH} next={next} />
      </IntlProvider>
    </div>
  );

  if (showPairing) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-6 p-6">
        <Logo size={40} />
        <div className="w-full max-w-3xl">
          <IntlProvider namespaces={["auth"]}>
            <QuickStart />
          </IntlProvider>
        </div>
        <p className="text-dim text-lg">{t("orPhone")}</p>
        <IntlProvider namespaces={["pair"]}>
          <PairScreen />
        </IntlProvider>
        <div className="w-full max-w-3xl">{emailCard}</div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-5">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="text-text inline-block">
          <Logo size={34} />
        </Link>
        {emailCard}
        {car ? null : (
          <div className="card p-5 flex items-center justify-between gap-4">
            <p className="text-sm text-dim">{t("carHint")}</p>
            <Link href="/pair" className="btn shrink-0">
              {t("carButton")}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
