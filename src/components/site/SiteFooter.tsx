import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const links = [
    ["/pricing", t("pricing")],
    ["/faq", t("faq")],
    ["/impressum", t("imprint")],
    ["/datenschutz", t("privacy")],
    ["/agb", t("terms")],
    ["/widerruf", t("withdrawal")],
    ["/disclaimer", t("disclaimer")],
    ["/lizenzen", t("licenses")],
  ] as const;
  return (
    <footer className="border-t border-border mt-16">
      <div className="mx-auto max-w-5xl px-5 py-8 text-sm text-dim space-y-4">
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label={t("navLabel")}>
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="hover:text-text underline-offset-4 hover:underline">
              {label}
            </Link>
          ))}
        </nav>
        <p>{t("independence")}</p>
        <p>{t("safety")}</p>
      </div>
    </footer>
  );
}
