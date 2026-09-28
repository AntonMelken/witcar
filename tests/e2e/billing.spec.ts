import { expect, test } from "@playwright/test";
import { clock, createLayout, login, onboard, ORIGIN, sendStripeEvent } from "./helpers";

const sub = (userId: string, status: string) => ({
  id: "sub_e2e_" + userId.slice(0, 8),
  object: "subscription",
  customer: "cus_e2e_" + userId.slice(0, 8),
  status,
  metadata: { userId },
  cancel_at_period_end: false,
  items: {
    data: [{ price: { id: "price_e2e_monthly" }, current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 }],
  },
});

test("test-mode purchase -> Pro -> cancel -> downgrade without data loss (webhook-driven)", async ({ page }) => {
  const userId = await login(page);
  await onboard(page.request);
  await createLayout(page.request, [clock("a", 0), clock("b", 4), clock("c", 8)]);

  // the upgrade button requires the explicit withdrawal waiver checkbox
  await page.goto("/pricing");
  await expect(page.getByText("Der Kauf ist noch nicht freigeschaltet.")).toBeVisible(); // no Stripe key in E2E

  const now = Math.floor(Date.now() / 1000);
  const checkout = {
    id: `evt_co_${userId}`,
    object: "event",
    type: "checkout.session.completed",
    created: now,
    data: {
      object: {
        id: "cs_e2e",
        object: "checkout.session",
        mode: "subscription",
        client_reference_id: userId,
        customer: sub(userId, "active").customer,
        subscription: sub(userId, "active").id,
        payment_status: "paid",
        metadata: { userId },
      },
    },
  };
  expect((await sendStripeEvent(page.request, checkout)).ok()).toBe(true);
  const updated = {
    id: `evt_up_${userId}`,
    object: "event",
    type: "customer.subscription.updated",
    created: now + 1,
    data: { object: sub(userId, "active") },
  };
  expect((await sendStripeEvent(page.request, updated)).ok()).toBe(true);

  await page.goto("/settings");
  await expect(page.getByTestId("plan")).toContainText("Pro");

  // Pro: 4 widgets + notes allowed
  const layouts = (await (await page.request.get("/api/layouts")).json()).layouts;
  const id = layouts[0].id;
  const proSave = await page.request.put(`/api/layouts/${id}`, {
    headers: ORIGIN,
    data: {
      name: "Pro",
      preset: "generic-landscape",
      widgets: [
        clock("a", 0),
        clock("b", 4),
        clock("c", 8),
        { widgetId: "n", type: "notes", x: 0, y: 4, w: 4, h: 4, config: { text: "Hallo" } },
      ],
    },
  });
  expect(proSave.ok()).toBe(true);

  // replay does not change state twice
  const replay = await sendStripeEvent(page.request, updated);
  expect((await replay.json()).outcome).toBe("duplicate");

  // cancellation -> downgrade: nothing deleted, overhang locked
  const deleted = {
    id: `evt_del_${userId}`,
    object: "event",
    type: "customer.subscription.deleted",
    created: now + 2,
    data: { object: sub(userId, "canceled") },
  };
  expect((await sendStripeEvent(page.request, deleted)).ok()).toBe(true);
  await page.goto("/settings");
  await expect(page.getByTestId("plan")).toContainText("Free");
  await page.goto("/dashboard");
  await expect(page.locator("[data-widget]")).toHaveCount(4);
  await expect(page.locator("[data-locked=true]")).toHaveCount(1);
  const full = (await (await page.request.get(`/api/layouts/${id}`)).json()).layout;
  expect(full.widgets).toHaveLength(4);
  expect(full.widgets.find((w: { type: string }) => w.type === "notes").config.text).toBe("Hallo");
});

test("webhook rejects missing or invalid signatures", async ({ request }) => {
  const res = await request.post("/api/stripe/webhook", {
    data: "{}",
    headers: { "content-type": "application/json" },
  });
  expect(res.status()).toBe(400);
  const forged = await request.post("/api/stripe/webhook", {
    data: JSON.stringify({ id: "evt_x", type: "customer.subscription.updated" }),
    headers: { "stripe-signature": "t=1,v1=deadbeef", "content-type": "application/json" },
  });
  expect(forged.status()).toBe(400);
  expect((await forged.json()).error.code).toBe("invalid_signature");
});
