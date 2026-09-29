import type { DashboardMode } from "../types";

/**
 * Data-source credit required by provider terms (Open-Meteo: CC BY 4.0 link
 * next to the data; CoinGecko: "Powered by CoinGecko"). Drive mode is
 * read-only, so the credit is plain text there; /lizenzen links it as well.
 */
export function SourceCredit({ label, href, mode }: { label: string; href: string; mode: DashboardMode }) {
  if (mode === "drive") return <span className="truncate">{label}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="truncate hover:underline underline-offset-2">
      {label}
    </a>
  );
}
