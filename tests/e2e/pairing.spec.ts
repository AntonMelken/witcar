import { expect, test } from "@playwright/test";
import { clock, createLayout, login, onboard, ORIGIN } from "./helpers";

test("device pairing: phone approves the car, car shows layout, revocation within 30 s", async ({ browser }) => {
  test.setTimeout(90_000);
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const car = await browser.newContext({ viewport: { width: 1920, height: 1200 } });
  await login(phone);
  await onboard(phone.request);
  expect(
    (await createLayout(phone.request, [clock("c1", 0), { ...clock("c2", 4), config: { label: "Zweite Uhr" } }])).ok(),
  ).toBe(true);

  // car: pairing screen with QR + code
  const carPage = await car.newPage();
  await carPage.goto("/pair");
  const codeEl = carPage.getByTestId("user-code");
  await expect(codeEl).toHaveText(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  await expect(carPage.locator("svg").first()).toBeVisible();
  const code = (await codeEl.textContent())!;

  // phone: manual entry works case-insensitively
  const phonePage = await phone.newPage();
  await phonePage.goto(`/link`);
  await phonePage.fill("input[name=code]", code.toLowerCase());
  await phonePage.fill("input[name=label]", "Testauto");
  await phonePage.getByRole("button", { name: "Gerät verbinden" }).click();
  await expect(phonePage.getByText(/Gerät verbunden/)).toBeVisible();

  // car picks up the approval by polling and lands on the dashboard
  await expect(carPage).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await expect(carPage.locator("[data-widget=clock]")).toHaveCount(2);
  await expect(carPage.getByText("Zweite Uhr")).toBeVisible();
  // device cookie is HttpOnly
  const cookies = await car.cookies();
  const device = cookies.find((c) => c.name === "wc_device")!;
  expect(device.httpOnly).toBe(true);
  expect(device.sameSite).toBe("Lax");
  expect(await carPage.evaluate(() => document.cookie)).not.toContain("wc_device");

  // the same code cannot be reused
  const reuse = await phone.request.post("/api/device/approve", { headers: ORIGIN, data: { userCode: code } });
  expect(reuse.status()).toBe(404);

  // phone revokes the device -> car leaves the dashboard within 30 s
  await phonePage.goto("/settings");
  await expect(phonePage.getByText("Testauto")).toBeVisible();
  await phonePage.locator("[data-device-id] button").click();
  await expect(phonePage.getByText("Testauto")).toHaveCount(0);
  await expect(carPage).toHaveURL(/\/pair\?revoked=1/, { timeout: 30_000 });
  expect((await car.request.get("/api/layouts")).status()).toBe(401);

  await phone.close();
  await car.close();
});

test("pairing requires a logged-in phone and valid codes", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/link?code=ABCDEFGH");
  await expect(page).toHaveURL(/\/login\?next=%2Flink%3Fcode%3DABCDEFGH/);
  const anon = await ctx.request.post("/api/device/approve", { headers: ORIGIN, data: { userCode: "ABCDEFGH" } });
  expect(anon.status()).toBe(401);
  await login(ctx);
  const bad = await ctx.request.post("/api/device/approve", { headers: ORIGIN, data: { userCode: "ABCD-EFG0" } });
  expect(bad.status()).toBe(400);
  const unknown = await ctx.request.post("/api/device/approve", { headers: ORIGIN, data: { userCode: "ABCD-EFGH" } });
  expect(unknown.status()).toBe(404);
  await ctx.close();
});

test("car browser: login page leads with the QR pairing and offers the e-mail code", async ({ browser }) => {
  const car = await browser.newContext({
    viewport: { width: 1920, height: 1200 },
    userAgent:
      "Mozilla/5.0 (X11; GNU/Linux) AppleWebKit/537.36 (KHTML, like Gecko) Chromium/136.0.0.0 Chrome/136.0.0.0 Safari/537.36 Tesla/2025.20.6",
  });
  const page = await car.newPage();
  await page.goto("/login?next=/settings");
  await expect(page.getByTestId("user-code")).toHaveText(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  await expect(page.getByRole("heading", { name: "Oder mit E-Mail-Code anmelden" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Mit Handy koppeln" })).toHaveCount(0);
  await car.close();
});

test("magic-link landing without tokens shows a way back to the login", async ({ page }) => {
  await page.goto("/auth/confirm?next=/settings#error=access_denied&error_code=otp_expired");
  await expect(page.getByText("Der Anmeldelink ist ungültig oder abgelaufen")).toBeVisible();
  // the fragment (tokens or error) is removed from the address bar
  expect(page.url()).not.toContain("#");
  await expect(page.getByRole("link", { name: "Zur Anmeldung" })).toHaveAttribute("href", "/login?next=%2Fsettings");
});
