import { expect, test } from "@playwright/test";
import { clock, createLayout, login, onboard, ORIGIN } from "./helpers";

test.describe("editor", () => {
  test("drag & drop, resize, autosave, undo/redo", async ({ page }) => {
    await login(page);
    await onboard(page.request);
    await createLayout(page.request, [clock("c1", 0)]);
    await page.goto("/editor");
    const canvas = page.getByTestId("editor-canvas");
    await expect(canvas).toBeVisible();
    const box = (await canvas.boundingBox())!;
    const cellW = box.width / 12;
    const cellH = box.height / 8;

    // drag the clock 4 columns to the right via its move handle
    const handle = page.locator('[data-widget-id="c1"] [data-handle=move]');
    const hb = (await handle.boundingBox())!;
    await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
    await page.mouse.down();
    await page.mouse.move(hb.x + hb.width / 2 + cellW * 2, hb.y + hb.height / 2, { steps: 5 });
    await page.mouse.move(hb.x + hb.width / 2 + cellW * 4, hb.y + hb.height / 2 + cellH * 2, { steps: 5 });
    await page.mouse.up();
    await expect(page.locator("[data-save-status]")).toHaveAttribute("data-save-status", "saved", { timeout: 5_000 });
    let layout = (await (await page.request.get("/api/layouts")).json()).layouts[0];
    let full = (await (await page.request.get(`/api/layouts/${layout.id}`)).json()).layout;
    expect(full.widgets[0]).toMatchObject({ x: 4, y: 2 });

    // resize via the resize handle (drag down-left shrinks width, grows height)
    const rh = (await page.locator('[data-widget-id="c1"] [data-handle=resize]').boundingBox())!;
    await page.mouse.move(rh.x + rh.width / 2, rh.y + rh.height / 2);
    await page.mouse.down();
    await page.mouse.move(rh.x + rh.width / 2 - cellW, rh.y + rh.height / 2 + cellH, { steps: 6 });
    await page.mouse.up();
    await expect(page.locator('[data-widget-id="c1"]')).toContainText("3×5");
    // dnd-kit swallows clicks for 50 ms after a drag ends
    await page.waitForTimeout(100);

    // add a widget, configure it, then undo twice and redo once
    await page.locator("[data-add-widget=date]").click();
    await expect(page.getByTestId("widget-panel")).toContainText("Datum");
    await page.getByRole("button", { name: "Rückgängig" }).click();
    await expect(page.locator("[data-editor-widget=date]")).toHaveCount(0);
    await page.getByRole("button", { name: "Wiederholen" }).click();
    await expect(page.locator("[data-editor-widget=date]")).toHaveCount(1);
    await expect(page.locator("[data-save-status]")).toHaveAttribute("data-save-status", "saved", { timeout: 5_000 });
    layout = (await (await page.request.get("/api/layouts")).json()).layouts[0];
    full = (await (await page.request.get(`/api/layouts/${layout.id}`)).json()).layout;
    expect(full.widgets.map((w: { type: string }) => w.type).sort()).toEqual(["clock", "date"]);

    // the dashboard renders the saved layout
    await page.goto("/dashboard");
    await expect(page.locator("[data-widget]")).toHaveCount(2);
  });

  test("free limit: 4th widget blocked in UI and on the server", async ({ page }) => {
    await login(page);
    await onboard(page.request);
    await createLayout(page.request, [clock("a", 0), clock("b", 4), clock("c", 8)]);
    await page.goto("/editor");
    await expect(page.locator("[data-add-widget=clock]")).toBeDisabled();
    await expect(page.getByText("Free erlaubt 3 Widgets pro Layout.")).toBeVisible();
    await expect(page.locator("[data-add-widget=notes]")).toContainText("Pro");

    const layouts = (await (await page.request.get("/api/layouts")).json()).layouts;
    const res = await page.request.put(`/api/layouts/${layouts[0].id}`, {
      headers: ORIGIN,
      data: {
        name: "x",
        preset: "generic-landscape",
        widgets: [clock("a", 0), clock("b", 4), clock("c", 8), clock("d", 0, 4)],
      },
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).error.code).toBe("too_many_widgets");
    const second = await page.request.post("/api/layouts", {
      headers: ORIGIN,
      data: { name: "2", preset: "generic-landscape", widgets: [] },
    });
    expect(second.status()).toBe(403);
  });

  test("touch: editor usable with touch emulation, targets >= 48 px", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
    const page = await ctx.newPage();
    await login(page);
    await onboard(page.request);
    await createLayout(page.request, [clock("t1", 0)]);
    await page.goto("/editor");
    await page.locator('[data-widget-id="t1"] button').first().tap();
    await expect(page.getByTestId("widget-panel")).toBeVisible();
    await page.getByRole("button", { name: "Breiter" }).tap();
    await page.getByRole("button", { name: "Nach rechts" }).tap();
    await expect(page.locator('[data-widget-id="t1"]')).toContainText("5×4");
    await page.locator("[data-add-widget=timer]").tap();
    await expect(page.locator("[data-editor-widget=timer]")).toHaveCount(1);

    for (const el of await page
      .locator(
        "header button, header a, header select, aside button, aside input:not([type=checkbox]), aside select, aside label:has(input[type=checkbox])",
      )
      .all()) {
      if (!(await el.isVisible())) continue;
      const b = (await el.boundingBox())!;
      expect(b.height, await el.evaluate((n) => n.outerHTML.slice(0, 80))).toBeGreaterThanOrEqual(48);
      if ((await el.evaluate((n) => n.tagName)) === "BUTTON") expect(b.width).toBeGreaterThanOrEqual(48);
    }
    for (const h of await page.locator("[data-handle]").all()) {
      const b = (await h.boundingBox())!;
      expect(b.width).toBeGreaterThanOrEqual(56);
      expect(b.height).toBeGreaterThanOrEqual(56);
    }
    await ctx.close();
  });
});
