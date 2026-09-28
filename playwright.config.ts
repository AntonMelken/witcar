import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
export const BASE_URL = `http://localhost:${PORT}`;

/** E2E runs against a production build with the local backend (PGlite + dev auth + mock providers). */
export const E2E_ENV = {
  NEXT_PUBLIC_SITE_URL: BASE_URL,
  WITCAR_DB: "pglite",
  PGLITE_DATA_DIR: "",
  WITCAR_AUTH: "dev",
  WITCAR_ALLOW_DEV_BACKEND: "1",
  WITCAR_SESSION_SECRET: "e2e-session-secret-0123456789-abcdefghij",
  WEATHER_PROVIDER: "mock",
  STOCKS_PROVIDER: "mock",
  CRYPTO_PROVIDER: "mock",
  STRIPE_WEBHOOK_SECRET: "whsec_e2e_test_secret",
  STRIPE_PRICE_PRO_MONTHLY: "price_e2e_monthly",
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    locale: "de-DE",
    timezoneId: "Europe/Berlin",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } }],
  webServer: {
    command: process.env.E2E_SKIP_BUILD ? `pnpm start -p ${PORT}` : `pnpm build && pnpm start -p ${PORT}`,
    url: `${BASE_URL}/api/health`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: E2E_ENV,
  },
});
