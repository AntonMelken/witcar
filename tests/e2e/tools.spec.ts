import { expect, test } from "@playwright/test";

test("G0 drive-test tool: counter runs, pings succeed, report can be sent", async ({ page }) => {
  await page.goto("/tools/drive-test");
  const counter = page.getByTestId("counter");
  const first = Number(await counter.textContent());
  await page.waitForTimeout(2200);
  expect(Number(await counter.textContent())).toBeGreaterThan(first);
  await expect(page.getByText(/Ping: [1-9]\d* ok/)).toBeVisible();
  await page.fill("input[name=model]", "Limousine 2021");
  await page.getByRole("button", { name: "Ergebnis senden" }).click();
  await expect(page.getByText("Danke, gespeichert.")).toBeVisible();
});

test("G1 calibrate tool shows viewport values", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1200 });
  await page.goto("/tools/calibrate");
  await expect(page.getByTestId("viewport")).toContainText("Viewport 1920×1200");
});
