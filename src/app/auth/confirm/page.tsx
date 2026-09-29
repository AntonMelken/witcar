import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ConfirmLogin } from "@/components/auth/ConfirmLogin";
import { IntlProvider } from "@/components/site/IntlProvider";
import { Logo } from "@/components/site/Logo";
import { safeNext } from "@/lib/auth/redirect";

export const metadata: Metadata = { title: "Anmelden", robots: { index: false }, referrer: "no-referrer" };

/** Magic-link landing: the session arrives in the URL fragment (see /auth/callback). */
export default async function ConfirmPage(props: PageProps<"/auth/confirm">) {
  const sp = await props.searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  const t = await getTranslations("auth");
  return (
    <main className="min-h-dvh flex items-center justify-center p-5">
      <div className="w-full max-w-md space-y-6">
        <Logo size={34} />
        <div className="card p-7 space-y-5">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <IntlProvider namespaces={["auth"]}>
            <ConfirmLogin next={next} />
          </IntlProvider>
        </div>
      </div>
    </main>
  );
}
