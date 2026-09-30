import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { THEME_COOKIE } from "@/lib/auth/cookies";
import "./globals.css";

const inter = localFont({
  src: "./fonts/InterVariable-latin.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "WitCar – Dein Überblick im Auto-Browser", template: "%s · WitCar" },
  description: "Anpassbares Widget-Dashboard für den Browser deines Fahrzeugs: Uhrzeit, Wetter, Kurse, Timer und mehr.",
  applicationName: "WitCar",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#efeff1",
  colorScheme: "light dark",
};

const THEMES = new Set(["auto", "dark", "light"]);
const DEFAULT_THEME = "light";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const jar = await cookies();
  const themeCookie = jar.get(THEME_COOKIE)?.value ?? DEFAULT_THEME;
  // Theme is resolved on the server -> no flash before first paint (§12.2)
  const theme = THEMES.has(themeCookie) ? themeCookie : DEFAULT_THEME;
  const locale = await getLocale();
  return (
    <html lang={locale} data-theme={theme} className={inter.variable}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
