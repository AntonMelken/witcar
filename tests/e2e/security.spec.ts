import { expect, test } from "@playwright/test";
import { login, ORIGIN } from "./helpers";

test.describe("API security", () => {
  test("cross-site mutating requests are rejected (CSRF)", async ({ page }) => {
    await login(page);
    const evil = await page.request.post("/api/layouts", {
      headers: { origin: "https://evil.example" },
      data: { name: "x", preset: "generic-landscape", widgets: [] },
    });
    expect(evil.status()).toBe(403);
    expect((await evil.json()).error.code).toBe("csrf");
  });

  test("inputs are validated with zod", async ({ page }) => {
    await login(page);
    const res = await page.request.post("/api/layouts", {
      headers: ORIGIN,
      data: { name: "", preset: "nope", widgets: "x" },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_input");
    const batch = await page.request.post("/api/widgets/batch", {
      headers: ORIGIN,
      data: { requests: [{ kind: "stock", params: { symbol: "../../etc" } }] },
    });
    expect(batch.status()).toBe(400);
  });

  test("protected routes require a session", async ({ request }) => {
    for (const path of ["/api/layouts", "/api/devices", "/api/account/export", "/api/profile"]) {
      expect((await request.get(path)).status(), path).toBe(401);
    }
  });

  test("device start is rate limited (10/h per IP)", async ({ request }) => {
    const ip = `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await request.post("/api/device/start", { headers: { ...ORIGIN, "x-forwarded-for": ip }, data: {} });
      statuses.push(res.status());
    }
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  test("device poll is limited to one request per 2 s", async ({ request }) => {
    const start = await (
      await request.post("/api/device/start", { headers: { ...ORIGIN, "x-forwarded-for": "10.8.0.1" }, data: {} })
    ).json();
    const first = await request.post("/api/device/poll", { headers: ORIGIN, data: { deviceCode: start.deviceCode } });
    const second = await request.post("/api/device/poll", { headers: ORIGIN, data: { deviceCode: start.deviceCode } });
    expect([first.status(), second.status()]).toContain(429);
  });

  test("account export and deletion (GDPR)", async ({ page }) => {
    await login(page);
    const exp = await page.request.get("/api/account/export");
    expect(exp.ok()).toBe(true);
    expect(exp.headers()["content-disposition"]).toContain("attachment");
    const data = await exp.json();
    expect(data.profile).toBeTruthy();
    const wrong = await page.request.delete("/api/account", { headers: ORIGIN, data: { confirm: "nein" } });
    expect(wrong.status()).toBe(400);
    const del = await page.request.delete("/api/account", { headers: ORIGIN, data: { confirm: "LÖSCHEN" } });
    expect(del.ok()).toBe(true);
    expect((await page.request.get("/api/profile")).status()).toBe(401);
  });

  test("in-car report form stores anonymous results", async ({ request }) => {
    const res = await request.post("/api/tools/report", {
      headers: ORIGIN,
      data: {
        visibleWhileDriving: "unknown",
        counterKeptRunning: "yes",
        networkActive: "partial",
        userAgent: "test",
        viewport: { w: 1920, h: 1200 },
        devicePixelRatio: 1,
      },
    });
    expect(res.status()).toBe(201);
  });
});
