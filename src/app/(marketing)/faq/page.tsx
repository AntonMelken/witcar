import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Prose } from "@/components/site/Prose";

export const metadata: Metadata = { title: "FAQ" };

const KEYS = ["what", "tesla", "driving", "hotspot", "login", "offline", "data", "cancel"] as const;

export default async function FaqPage() {
  const t = await getTranslations("faq");
  return (
    <Prose title={t("title")}>
      {KEYS.map((k) => (
        <section key={k}>
          <h2>{t(`${k}.q`)}</h2>
          <p>{t(`${k}.a`)}</p>
        </section>
      ))}
    </Prose>
  );
}
