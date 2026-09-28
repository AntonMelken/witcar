import { describe, expect, it } from "vitest";
import { effectivePlan, PAST_DUE_GRACE_MS } from "@/lib/plan";

const base = {
  plan: "pro" as const,
  status: "active",
  pastDueSince: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

describe("effectivePlan", () => {
  it("maps stripe states to plans", () => {
    expect(effectivePlan(null)).toBe("free");
    expect(effectivePlan(base)).toBe("pro");
    expect(effectivePlan({ ...base, status: "trialing" })).toBe("pro");
    expect(effectivePlan({ ...base, status: "canceled" })).toBe("free");
    expect(effectivePlan({ ...base, status: "incomplete" })).toBe("free");
    expect(effectivePlan({ ...base, plan: "free" })).toBe("free");
  });

  it("keeps pro for 7 days past_due, then downgrades", () => {
    const now = Date.parse("2026-10-10T00:00:00Z");
    const sub = { ...base, status: "past_due", pastDueSince: new Date(now - PAST_DUE_GRACE_MS + 60_000).toISOString() };
    expect(effectivePlan(sub, now)).toBe("pro");
    expect(effectivePlan({ ...sub, pastDueSince: new Date(now - PAST_DUE_GRACE_MS - 1).toISOString() }, now)).toBe(
      "free",
    );
  });
});
