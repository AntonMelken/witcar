import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LinkForm } from "@/components/pairing/LinkForm";
import { IntlProvider } from "@/components/site/IntlProvider";
import { Logo } from "@/components/site/Logo";
import { requireUserPage } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Gerät verbinden", robots: { index: false } };

/** Phone: confirm the code shown in the car (QR or manual entry, §8.2/§8.4). */
export default async function LinkPage(props: PageProps<"/link">) {
  const sp = await props.searchParams;
  const code = typeof sp.code === "string" ? sp.code.slice(0, 12) : "";
  await requireUserPage(code ? `/link?code=${encodeURIComponent(code)}` : "/link");
  const t = await getTranslations("link");
  return (
    <main className="min-h-dvh flex items-center justify-center p-5">
      <div className="w-full max-w-md space-y-6">
        <Link href="/dashboard" className="text-text inline-block">
          <Logo size={34} />
        </Link>
        <div className="card p-7 space-y-5">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-dim">{t("subtitle")}</p>
          <IntlProvider namespaces={["link"]}>
            <LinkForm initialCode={code} />
          </IntlProvider>
        </div>
      </div>
    </main>
  );
}
