import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
export const BASE_URL = `http://localhost:${PORT}`;
/** Second server of the same build with plan limits enforced (WITCAR_OPEN_ACCESS=0) for the "@limits" tests. */
const LIMITS_PORT = PORT + 1;
const LIMITS_URL = `http://localhost:${LIMITS_PORT}`;

/** E2E runs against a production build with the local backend (PGlite + name login + mock providers). */
export const E2E_ENV = {
  NEXT_PUBLIC_SITE_URL: BASE_URL,
  WITCAR_DB: "pglite",
  PGLITE_DATA_DIR: "",
  WITCAR_AUTH: "name",
  WITCAR_ALLOW_DEV_BACKEND: "1",
  WITCAR_OPEN_ACCESS: "1",
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
  projects: [
    {
      name: "chromium",
      grepInvert: /@limits/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "limits",
      grep: /@limits/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, baseURL: LIMITS_URL },
    },
  ],
  webServer: [
    {
      // Start Next directly (not via `pnpm start`): the pnpm wrapper detaches the
      // server, so Playwright could not stop it and the run never finished.
      command: `${process.env.E2E_SKIP_BUILD ? "" : "pnpm build && "}exec node node_modules/next/dist/bin/next start -p ${PORT}`,
      url: `${BASE_URL}/api/health`,
      timeout: 300_000,
      reuseExistingServer: !process.env.CI,
      env: E2E_ENV,
    },
    {
      command: `exec node node_modules/next/dist/bin/next start -p ${LIMITS_PORT}`,
      url: `${LIMITS_URL}/api/health`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: { ...E2E_ENV, WITCAR_OPEN_ACCESS: "0" },
    },
  ],
});
