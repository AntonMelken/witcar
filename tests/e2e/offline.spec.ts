import { expect, test } from "@playwright/test";
import { createLayout, login, onboard } from "./helpers";

test("offline start shows the last data with a stale marker", async ({ page, context }) => {
  await login(page);
  await onboard(page.request);
  await createLayout(page.request, [
    { widgetId: "s1", type: "stocks", x: 0, y: 0, w: 4, h: 4, config: { symbols: ["AAPL"] } },
    { widgetId: "c1", type: "clock", x: 4, y: 0, w: 4, h: 4, config: {} },
  ]);
  await page.goto("/dashboard");
  await expect(page.locator("[data-widget=stocks]")).toContainText("$");
  // wait until the service worker controls the page and has cached the shell
  await page.waitForFunction(() => document.documentElement.dataset.swReady === "1", null, { timeout: 20_000 });
  const price = await page.locator("[data-widget=stocks] [data-bignumber]").textContent();

  // pretend the data is old, then go offline and restart the app
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("wc:data:v1") ?? "{}");
    for (const k of Object.keys(raw)) raw[k].fetchedAt = new Date(Date.now() - 20 * 60_000).toISOString();
    localStorage.setItem("wc:data:v1", JSON.stringify(raw));
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("[data-widget=stocks] [data-bignumber]")).toHaveText(price!);
  await expect(page.locator("[data-widget=stocks] [data-stale]")).toContainText("20 Min");
  await expect(page.locator("[data-widget=clock] [data-bignumber]")).toHaveText(/\d{2}:\d{2}/);
  // no error dialogs
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // back online: data refreshes by itself
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.locator("[data-widget=stocks] [data-stale]")).toHaveCount(0, { timeout: 15_000 });
});
