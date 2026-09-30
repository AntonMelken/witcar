import { expect, test } from "@playwright/test";
import { gzipSync } from "node:zlib";
import { clock, createLayout, login, onboard } from "./helpers";

/** Masterplan §17: /dashboard initial JS <= 150 kB gzip. */
test("dashboard initial JS stays within 150 kB gzip", async ({ page }) => {
  await login(page);
  await onboard(page.request);
  await createLayout(page.request, [
    clock("c1", 0),
    {
      widgetId: "w1",
      type: "weather",
      x: 4,
      y: 0,
      w: 4,
      h: 4,
      config: { location: { name: "Berlin", lat: 52.52, lon: 13.41 } },
    },
    { widgetId: "s1", type: "stocks", x: 8, y: 0, w: 4, h: 4, config: { symbols: ["AAPL"] } },
  ]);
  const scripts = new Set<string>();
  page.on("response", (r) => {
    if (r.request().resourceType() === "script" && r.url().includes("/_next/")) scripts.add(r.url());
  });
  await page.goto("/dashboard", { waitUntil: "networkidle" });
  let total = 0;
  const sizes: [string, number][] = [];
  for (const url of scripts) {
    const body = await (await page.request.get(url)).body();
    const gz = gzipSync(body).length;
    sizes.push([url.split("/").pop()!, gz]);
    total += gz;
  }
  console.log(`dashboard JS: ${(total / 1024).toFixed(1)} kB gzip in ${scripts.size} files`);
  for (const [name, gz] of sizes.sort((x, y) => y[1] - x[1])) console.log(`  ${(gz / 1024).toFixed(1)} kB  ${name}`);
  expect(total).toBeLessThanOrEqual(150 * 1024);
});
