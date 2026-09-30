import { expect, test } from "@playwright/test";
import { uniqueName } from "./helpers";

test("onboarding: login -> preset -> 3 widgets -> dashboard, layout persists", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  await page.fill("input[name=name]", uniqueName("Onboard"));
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  await page.getByRole("button", { name: /Ultrabreit/ }).click();
  await page.getByRole("button", { name: "Weiter" }).click();
  // replace stocks by date
  await page.getByRole("button", { name: "Aktien" }).click();
  await page.getByRole("button", { name: "Datum" }).click();
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(page.getByText("Handy-Hotspot")).toBeVisible();
  const finish = page.getByRole("button", { name: /Fertig/ });
  await expect(finish).toBeDisabled();
  await page.getByRole("checkbox").check();
  await finish.click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator("[data-widget]")).toHaveCount(3);
  await expect(page.locator("[data-widget=date]")).toBeVisible();
  await expect(page.locator("[data-widget=weather]")).toContainText("Berlin");
  await page.reload();
  await expect(page.locator("[data-widget]")).toHaveCount(3);
});
