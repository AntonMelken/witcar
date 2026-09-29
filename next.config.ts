import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { parseEnv } from "./src/lib/env";

// Fail the build early when required env values are missing (masterplan §20).
// `next typegen` (typecheck script) loads this config too and skips the check.
if (process.env.WITCAR_ENV_CHECK !== "off") parseEnv();
const isHttps = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

// Vercel sets VERCEL_GIT_COMMIT_SHA, Coolify passes SOURCE_COMMIT (Dockerfile build arg)
const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.SOURCE_COMMIT;
const buildId = commit?.slice(0, 12) ?? `local-${Date.now().toString(36)}`;

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
  // Self-hosting (Dockerfile, Hetzner + Coolify): minimal server in .next/standalone
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
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
