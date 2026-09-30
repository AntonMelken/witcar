import { describe, expect, it } from "vitest";
import { MemoryKV } from "@/lib/cache/kv";
import { rateLimit, RULES } from "@/lib/cache/rateLimit";

describe("rateLimit", () => {
  it("allows up to the limit per window, then blocks until the next window", async () => {
    let now = 1_000_000;
    const kv = new MemoryKV(() => now);
    const rule = { name: "t", limit: 3, windowSec: 60 };
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimit(kv, rule, "ip:1", now));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false]);
    expect(results[3]!.retryAfterSec).toBeGreaterThan(0);
    expect((await rateLimit(kv, rule, "ip:2", now)).ok).toBe(true);
    now += 60_000;
    expect((await rateLimit(kv, rule, "ip:1", now)).ok).toBe(true);
  });

  it("supports weighted requests (batch items)", async () => {
    const kv = new MemoryKV();
    expect((await rateLimit(kv, RULES.widgetsUser, "u", 0, 150)).ok).toBe(true);
    expect((await rateLimit(kv, RULES.widgetsUser, "u", 0, 31)).ok).toBe(false);
  });

  it("device poll: max 1 per 2 s", async () => {
    const kv = new MemoryKV();
    expect((await rateLimit(kv, RULES.devicePoll, "c", 10_000)).ok).toBe(true);
    expect((await rateLimit(kv, RULES.devicePoll, "c", 10_500)).ok).toBe(false);
    expect((await rateLimit(kv, RULES.devicePoll, "c", 13_000)).ok).toBe(true);
  });
});
