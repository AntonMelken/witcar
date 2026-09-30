import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/pricing",
  "/faq",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/widerruf",
  "/disclaimer",
  "/lizenzen",
  "/login",
  "/pair",
  "/demo",
];

test.describe("marketing & legal", () => {
  for (const path of PAGES) {
    test(`page ${path} renders`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await page.waitForLoadState("networkidle");
      expect(errors).toEqual([]);
    });
  }

  test("brand rules: independence disclaimer, no Tesla in logo/title", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText("WitCar ist ein unabhängiges Produkt und steht in keiner Verbindung zu Tesla, Inc."),
    ).toBeVisible();
    await expect(page).toHaveTitle(/WitCar/);
    expect(await page.title()).not.toMatch(/tesla/i);
    for (const img of await page.locator("img, svg[aria-label]").all()) {
      expect((await img.getAttribute("alt")) ?? (await img.getAttribute("aria-label")) ?? "").not.toMatch(/tesla/i);
    }
  });

  test("licence notices: page lists dependencies and serves the full texts", async ({ page, request }) => {
    await page.goto("/lizenzen");
    await expect(page.getByRole("cell", { name: "lucide-react" })).toBeVisible();
    // E2E runs with mock providers: no live source to credit, demo data is explained
    await expect(page.locator("[data-source]")).toHaveCount(0);
    await expect(page.getByText(/zeigen die Widgets Demo-Daten/)).toBeVisible();
    const res = await request.get("/third-party-licenses.txt");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain("SIL OPEN FONT LICENSE");
    expect(text).toContain("Lucide Icons and Contributors");
  });

  test("legal placeholders are clearly marked for the owner", async ({ page }) => {
    for (const path of ["/impressum", "/datenschutz", "/agb", "/widerruf"]) {
      await page.goto(path);
      await expect(page.locator('[data-todo="TODO_OWNER_LEGAL"]').first()).toBeVisible();
    }
  });

  test("security headers and strict CSP", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["permissions-policy"]).toContain("camera=()");
    expect(h["content-security-policy"]).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("PWA manifest and service worker are served", async ({ request }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest.short_name).toBe("WitCar");
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
    const sw = await request.get("/sw.js");
    expect(sw.headers()["content-type"]).toContain("javascript");
    expect(await sw.text()).toContain("wc-static-");
  });
});
