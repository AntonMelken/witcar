import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Logo } from "./Logo";

export async function SiteHeader() {
  const t = await getTranslations("nav");
  return (
    <header className="border-b border-border">
      <div className="mx-auto max-w-5xl px-5 h-16 flex items-center justify-between gap-4">
        <Link href="/" aria-label="WitCar" className="text-text">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3 text-sm">
          <Link href="/pricing" className="px-2 py-3 text-dim hover:text-text">
            {t("pricing")}
          </Link>
          <Link href="/faq" className="px-2 py-3 text-dim hover:text-text hidden sm:inline">
            {t("faq")}
          </Link>
          <Link href="/login" className="btn btn-ghost">
            {t("login")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
