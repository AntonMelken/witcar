import { expect, test } from "@playwright/test";

// Test candidates from masterplan §18; update after gate G1.
const MATRIX = [
  { width: 1920, height: 1200 },
  { width: 2200, height: 1300 },
  { width: 2448, height: 1080 },
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
];

for (const vp of MATRIX) {
  test(`fixture layout renders at ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    // the anonymous demo is rate limited per IP; give each run its own client IP
    await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.7.${vp.width % 250}.${vp.height % 250}` });
    await page.goto("/demo");
    const cells = page.locator("[data-widget]");
    await expect(cells).toHaveCount(7);
    await expect(page.locator("[data-widget=weather]")).toContainText("°");
    for (const cell of await cells.all()) {
      const box = (await cell.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(96);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
      if (vp.width > 640) expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 1);
    }
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(vp.width);
  });
}
