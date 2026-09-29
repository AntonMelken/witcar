import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { QuickStart } from "@/components/auth/QuickStart";
import { PairScreen } from "@/components/pairing/PairScreen";
import { IntlProvider } from "@/components/site/IntlProvider";
import { Logo } from "@/components/site/Logo";
import { getDevicePrincipal } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Mit Handy anmelden", robots: { index: false } };

/** Car browser: shows QR + user code and polls until the phone approves (§8.2). */
export default async function PairPage(props: PageProps<"/pair">) {
  const sp = await props.searchParams;
  if (!sp.revoked && (await getDevicePrincipal())) redirect("/dashboard");
  const t = await getTranslations("pair");
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-8 p-6">
      <Logo size={40} />
      {sp.revoked ? <p className="text-warning">{t("revoked")}</p> : null}
      <div className="w-full max-w-3xl">
        <IntlProvider namespaces={["auth"]}>
          <QuickStart />
        </IntlProvider>
      </div>
      <IntlProvider namespaces={["pair"]}>
        <PairScreen />
      </IntlProvider>
      <p className="text-dim text-sm max-w-xl text-center">{t("hotspotHint")}</p>
    </main>
  );
}
