import { expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import Stripe from "stripe";
import { BASE_URL, E2E_ENV } from "../../playwright.config";

export const ORIGIN = { origin: BASE_URL };

let counter = 0;
export function uniqueEmail(prefix = "user"): string {
  counter++;
  return `${prefix}-${Date.now().toString(36)}-${counter}@example.com`;
}

/** Dev-auth login (E2E runs with WITCAR_AUTH=dev). Returns the user id. */
export async function login(ctx: BrowserContext | Page, email = uniqueEmail()): Promise<string> {
  const request: APIRequestContext = "request" in ctx ? ctx.request : (ctx as BrowserContext).request;
  const res = await request.post("/api/auth/dev-login", { data: { email }, headers: ORIGIN });
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { userId: string }).userId;
}

export async function createLayout(
  request: APIRequestContext,
  widgets: unknown[],
  extra: Record<string, unknown> = {},
) {
  const res = await request.post("/api/layouts", {
    headers: ORIGIN,
    data: { name: "E2E", preset: "generic-landscape", mode: "standard", widgets, makeDefault: true, ...extra },
  });
  return res;
}

export async function onboard(request: APIRequestContext) {
  await request.patch("/api/profile", { headers: ORIGIN, data: { onboarded: true } });
}

export const clock = (id: string, x: number, y = 0) => ({ widgetId: id, type: "clock", x, y, w: 4, h: 4, config: {} });

/** Sends a correctly signed Stripe webhook (test secret from the E2E env). */
export async function sendStripeEvent(request: APIRequestContext, event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  const stripe = new Stripe("sk_test_e2e");
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: E2E_ENV.STRIPE_WEBHOOK_SECRET });
  return request.post("/api/stripe/webhook", {
    headers: { "stripe-signature": signature, "content-type": "application/json" },
    data: payload,
  });
}
