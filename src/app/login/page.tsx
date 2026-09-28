import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/LoginForm";
import { IntlProvider } from "@/components/site/IntlProvider";
import { Logo } from "@/components/site/Logo";
import { safeNext } from "@/lib/auth/redirect";
import { getUserSession } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Anmelden", robots: { index: false } };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  if (await getUserSession()) redirect(next);
  const t = await getTranslations("auth");
  return (
    <main className="min-h-dvh flex items-center justify-center p-5">
      <div className="w-full max-w-md space-y-6">
        <Link href="/" className="text-text inline-block">
          <Logo size={34} />
        </Link>
        <div className="card p-7 space-y-5">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-dim">{t("subtitle")}</p>
          {sp.error ? <p className="text-negative text-sm">{t("linkError")}</p> : null}
          <IntlProvider namespaces={["auth"]}>
            <LoginForm mode={getEnv().WITCAR_AUTH} next={next} />
          </IntlProvider>
        </div>
        <div className="card p-5 flex items-center justify-between gap-4">
          <p className="text-sm text-dim">{t("carHint")}</p>
          <Link href="/pair" className="btn shrink-0">
            {t("carButton")}
          </Link>
        </div>
      </div>
    </main>
  );
}
