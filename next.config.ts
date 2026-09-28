import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { parseEnv } from "./src/lib/env";

// Fail the build early when required env values are missing (masterplan §20).
// `next typegen` (typecheck script) loads this config too and skips the check.
if (process.env.WITCAR_ENV_CHECK !== "off") parseEnv();
const isHttps = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

const buildId = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? `local-${Date.now().toString(36)}`;

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  ...(isHttps ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
