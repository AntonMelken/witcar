import { expect, test, type Page } from "@playwright/test";
import { createLayout, login, onboard } from "./helpers";

const cell = (type: string, id: string, x: number, config: Record<string, unknown>, y = 0) => ({
  widgetId: id,
  type,
  x,
  y,
  w: 4,
  h: 4,
  config,
});

async function setup(page: Page, widgets: unknown[]) {
  await login(page);
  await onboard(page.request);
  const res = await createLayout(page.request, widgets);
  expect(res.ok()).toBeTruthy();
  await page.goto("/dashboard");
}

const open = async (page: Page, type: string, name: string) => {
  await page
    .locator(`[data-widget=${type}]`)
    .getByRole("button", { name: `${name} öffnen` })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
};
const close = async (page: Page) => {
  await page.getByTestId("app-close").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
};

test.describe("widget apps", () => {
  test("default design is white; tapping a widget opens its app, Escape closes it", async ({ page }) => {
    await setup(page, [cell("clock", "c1", 0, {})]);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await open(page, "clock", "Uhr");
    await expect(page.getByTestId("app-clock-main")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("clock: pick time zones, own location, saved on the server", async ({ page }) => {
    await setup(page, [cell("clock", "c1", 0, {})]);
    await open(page, "clock", "Uhr");
    await expect(page.getByText(/Zeitzone dieses Geräts: Europe\/Berlin/)).toBeVisible();

    await page.getByPlaceholder("Stadt, Land oder Zeitzone suchen").fill("tokio");
    await page.getByRole("button", { name: "Tokio hinzufügen" }).click();
    await page.getByPlaceholder("Stadt, Land oder Zeitzone suchen").fill("new york");
    await page.getByRole("button", { name: "New York hinzufügen" }).click();
    await expect(page.locator("[data-zone='Asia/Tokyo']")).toBeVisible();
    await expect(page.locator("[data-zone='America/New_York']")).toBeVisible();

    // the main clock can be another place
    await page.getByPlaceholder("Stadt, Land oder Zeitzone suchen").fill("sydney");
    await page.getByRole("button", { name: "Sydney zur Hauptuhr machen" }).click();
    await expect(page.getByTestId("app-clock-main")).toBeVisible();
    await close(page);

    const clock = page.locator("[data-widget=clock]");
    await expect(clock).toContainText("Sydney");
    await expect(clock).toContainText("Tokio");
    await page.reload();
    await expect(page.locator("[data-widget=clock]")).toContainText("Tokio");
    await expect(page.locator("[data-widget=clock]")).toContainText("Sydney");
  });

  test("weather: several places and the seven-day forecast Monday to Sunday", async ({ page }) => {
    await setup(page, [cell("weather", "w1", 0, { location: { name: "Berlin", lat: 52.52, lon: 13.41 } })]);
    await expect(page.getByTestId("week-strip").locator("li")).toHaveCount(7);
    await open(page, "weather", "Wetter");
    await expect(page.getByTestId("week-list").locator("li")).toHaveCount(7);
    await page.getByRole("button", { name: "Ort hinzufügen" }).click();
    await page.getByPlaceholder("Stadt suchen").fill("Hamburg");
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: /^Hamburg/ }).click();
    await expect(page.getByTestId("weather-chips")).toContainText("Hamburg");
    await expect(page.getByTestId("weather-chips")).toContainText("Berlin");
    await close(page);

    await expect(page.getByTestId("weather-places")).toContainText("Hamburg");
    await expect(page.getByTestId("weather-places")).toContainText("Berlin");
    await page.reload();
    await expect(page.getByTestId("weather-places")).toContainText("Hamburg");
  });

  test("stocks: pick stocks, chart with ranges, position calculator", async ({ page }) => {
    await setup(page, [cell("stocks", "s1", 0, { symbols: ["AAPL"], showChange: true })]);
    await open(page, "stocks", "Aktien");
    await page.getByPlaceholder(/Name oder Symbol/).fill("msft");
    await page.getByRole("button", { name: "Symbol MSFT hinzufügen" }).click();
    await expect(page.getByTestId("watchlist")).toContainText("MSFT");
    await expect(page.getByTestId("price-chart")).toBeVisible();
    await page.getByRole("button", { name: "1 W" }).click();
    await expect(page.getByRole("button", { name: "1 W" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("price-chart")).toBeVisible();
    await page.getByLabel("Gleitender Durchschnitt").check();
    await expect(page.getByTestId("stock-stats")).toBeVisible();

    await page.getByLabel("Stückzahl").fill("10");
    await page.getByLabel(/Kaufkurs/).fill("100");
    await expect(page.getByTestId("calc-result")).toContainText("Gewinn");
    await close(page);
    await expect(page.locator("[data-widget=stocks]")).toContainText("MSFT");
  });

  test("timer: choose any time (keypad, presets), start, pause, reset", async ({ page }) => {
    await setup(page, [cell("timer", "t1", 0, { durationSec: 600, label: "" })]);
    await open(page, "timer", "Timer");
    await expect(page.getByTestId("app-timer-display")).toContainText("10:00");

    // 1 h 5 min 30 s typed like on a microwave
    for (const k of ["1", "0", "5", "3", "0"])
      await page.getByRole("group", { name: "Ziffernblock" }).getByRole("button", { name: k, exact: true }).click();
    await expect(page.getByTestId("keypad-display")).toHaveText("01:05:30");
    await page.getByTestId("keypad-apply").click();
    await expect(page.getByTestId("app-timer-display")).toContainText("1:05:30");

    await page.getByRole("button", { name: "3 Min." }).click();
    await expect(page.getByTestId("app-timer-display")).toContainText("03:00");
    await page.getByTestId("app-timer-start").click();
    await expect(page.getByTestId("app-timer-pause")).toBeVisible();
    await page.getByTestId("app-timer-pause").click();
    await expect(page.getByTestId("app-timer-start")).toBeVisible();
    await page.getByTestId("app-timer-reset").click();
    await close(page);

    // the chosen time is the widget's time and survives a reload
    await expect(page.locator("[data-widget=timer]")).toContainText("03:00");
    await page.reload();
    await expect(page.locator("[data-widget=timer]")).toContainText("03:00");
  });

  test("timer buttons in the widget still work (not covered by the open-app button)", async ({ page }) => {
    await setup(page, [cell("timer", "t1", 0, { durationSec: 120, label: "" })]);
    await page.getByRole("button", { name: "Start" }).click();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("notes: create, select, edit and delete several notes", async ({ page }) => {
    await setup(page, [cell("notes", "n1", 0, { notes: [], activeId: null })]);
    await open(page, "notes", "Notiz");
    await page.getByTestId("note-new").click();
    await page.getByTestId("note-title").fill("Einkauf");
    await page.getByTestId("note-text").fill("Milch\nBrot");
    await page.getByTestId("note-new").click();
    await page.getByTestId("note-title").fill("Termine");
    await page.getByTestId("note-text").fill("Werkstatt Do");
    await expect(page.getByTestId("note-list").locator("li")).toHaveCount(2);

    // the first note is shown in the widget; choose the second one instead
    await page.getByRole("button", { name: "Im Widget anzeigen", exact: true }).click();
    await close(page);
    const widget = page.locator("[data-widget=notes]");
    await expect(widget).toContainText("Termine");
    await expect(widget).toContainText("Werkstatt Do");
    await expect(widget).toContainText("Notiz 2 von 2");
    await page.reload();
    await expect(page.locator("[data-widget=notes]")).toContainText("Werkstatt Do");

    // select the first note again, edit it and delete it
    await open(page, "notes", "Notiz");
    await page
      .getByTestId("note-list")
      .getByRole("button", { name: /Einkauf/ })
      .first()
      .click();
    await expect(page.getByTestId("note-text")).toHaveValue("Milch\nBrot");
    await page.getByTestId("note-text").fill("Milch\nBrot\nEier");
    await page.getByTestId("note-delete").click();
    await page.getByTestId("note-delete-confirm").click();
    await expect(page.getByTestId("note-list").locator("li")).toHaveCount(1);
    await close(page);
    await expect(page.locator("[data-widget=notes]")).toContainText("Termine");
    await expect(page.locator("[data-widget=notes]")).not.toContainText("Einkauf");
  });

  test("refresh button asks the server to bypass its cache", async ({ page }) => {
    await setup(page, [cell("weather", "w1", 0, { location: { name: "Berlin", lat: 52.52, lon: 13.41 } })]);
    const forced = page.waitForRequest(
      (r) => r.url().endsWith("/api/widgets/batch") && r.postDataJSON()?.force === true,
    );
    await page.getByTestId("refresh").click();
    await forced;
    await expect(page.getByTestId("updated")).toContainText("Aktualisiert");
  });

  test("drive mode has no apps and no refresh controls", async ({ page }) => {
    await setup(page, [cell("clock", "c1", 0, {})]);
    await page.goto("/dashboard?mode=drive");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Fahrmodus starten" }).click();
    await expect(page.locator("main[data-mode=drive]")).toBeVisible();
    await expect(page.locator(".wc-open")).toHaveCount(0);
    await expect(page.getByTestId("refresh")).toHaveCount(0);
  });
});
