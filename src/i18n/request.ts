import { getRequestConfig } from "next-intl/server";

export const LOCALES = ["de"] as const;
export const DEFAULT_LOCALE = "de";

/**
 * German only for the MVP; English follows in Phase 5 (masterplan §0.4).
 * No locale routing: the locale will come from the profile/cookie later.
 */
export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  return {
    locale,
    timeZone: "Europe/Berlin",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
