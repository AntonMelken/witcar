import { expect, test } from "@playwright/test";
import { clock, createLayout, login, onboard } from "./helpers";

test("drive mode: safety notice once, read-only large tiles, no editor code, long-press exit", async ({ page }) => {
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
    { widgetId: "s1", type: "stocks", x: 8, y: 0, w: 4, h: 4, config: { symbols: ["AAPL", "MSFT"] } },
  ]);
  await page.goto("/dashboard?mode=drive");
  await expect(page.getByRole("heading", { name: "Sicherheitshinweis zum Fahrmodus" })).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Fahrmodus starten" }).click();

  const main = page.locator("main[data-mode=drive]");
  await expect(main).toBeVisible();
  await expect(page.locator("[data-widget]")).toHaveCount(3);
  await expect(page.locator("[data-widget=stocks]")).not.toContainText("MSFT");
  // only one control: the exit button; no inputs, links or editor elements
  await expect(page.locator("main button")).toHaveCount(1);
  await expect(page.locator("main input, main select, main textarea, main a")).toHaveCount(0);
  await expect(page.locator("[data-testid=editor-canvas]")).toHaveCount(0);
  // no animations/transitions and no scrolling
  const styles = await page
    .locator("[data-widget]")
    .first()
    .evaluate((el) => {
      const s = getComputedStyle(el);
      return { animation: s.animationName, transition: s.transitionDuration };
    });
  expect(styles.animation).toBe("none");
  expect(styles.transition).toBe("0s");
  expect(await main.evaluate((el) => getComputedStyle(el).overflow)).toBe("hidden");
  // main values >= 64 px
  for (const big of await page.locator("[data-bignumber]").all()) {
    const size = await big.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(64);
  }

  // a short tap does nothing, a long press exits
  const exit = page.locator("[data-drive-exit]");
  await exit.click();
  await expect(page).toHaveURL(/mode=drive/);
  const b = (await exit.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1300);
  await page.mouse.up();
  await expect(page).toHaveURL(/\/dashboard$/);

  // the notice is shown only once
  await page.goto("/dashboard?mode=drive");
  await expect(page.locator("main[data-mode=drive]")).toBeVisible();
});
