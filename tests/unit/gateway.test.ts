import { describe, expect, it, vi } from "vitest";
import { DataGateway, ProviderUnavailableError } from "@/lib/cache/gateway";
import { MemoryKV } from "@/lib/cache/kv";

function setup(opts: { dailyLimits?: Record<string, number> } = {}) {
  let now = Date.parse("2026-09-28T10:00:00Z");
  const clock = () => now;
  const kv = new MemoryKV(clock);
  const logger = { warn: vi.fn(), error: vi.fn() };
  const gw = new DataGateway(kv, { now: clock, logger, ...opts });
  return { gw, kv, logger, advance: (ms: number) => (now += ms) };
}

const req = (fetcher: () => Promise<unknown>, extra: Partial<{ key: string; provider: string }> = {}) => ({
  provider: extra.provider ?? "p",
  key: extra.key ?? "k",
  ttlMs: 60_000,
  maxStaleMs: 3600_000,
  fetcher,
});

describe("DataGateway", () => {
  it("serves fresh data from cache within the TTL", async () => {
    const { gw, advance } = setup();
    const fetcher = vi.fn(async () => ({ v: 1 }));
    const first = await gw.get(req(fetcher));
    advance(30_000);
    const second = await gw.get(req(fetcher));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(second).toEqual({ ...first, stale: false });
    expect(first.source).toBe("p");
  });

  it("coalesces 100 parallel identical requests into ONE upstream call", async () => {
    const { gw } = setup();
    let resolve!: (v: unknown) => void;
    const fetcher = vi.fn(() => new Promise((r) => (resolve = r)));
    const all = Promise.all(Array.from({ length: 100 }, () => gw.get(req(fetcher))));
    await new Promise((r) => setTimeout(r, 10));
    resolve({ price: 42 });
    const results = await all;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(results.every((r) => (r.data as { price: number }).price === 42)).toBe(true);
  });

  it("stale-while-revalidate: returns stale data immediately and refreshes in background", async () => {
    const { gw, advance } = setup();
    let n = 0;
    const fetcher = vi.fn(async () => ({ n: ++n }));
    await gw.get(req(fetcher));
    advance(61_000);
    const tasks: Promise<unknown>[] = [];
    const stale = await gw.get({ ...req(fetcher), background: (t) => tasks.push(t) });
    expect(stale.stale).toBe(true);
    expect(stale.data).toEqual({ n: 1 });
    await Promise.all(tasks);
    const fresh = await gw.get(req(fetcher));
    expect(fresh).toMatchObject({ data: { n: 2 }, stale: false });
  });

  it("provider outage -> keeps serving stale data, circuit opens after 5 failures", async () => {
    const { gw, advance, logger } = setup();
    await gw.get(req(async () => ({ ok: true })));
    advance(61_000);
    const failing = vi.fn(async () => {
      throw new Error("down");
    });
    for (let i = 0; i < 5; i++) {
      const tasks: Promise<unknown>[] = [];
      const res = await gw.get({ ...req(failing), background: (t) => tasks.push(t) });
      expect(res).toMatchObject({ data: { ok: true }, stale: true });
      await Promise.all(tasks);
    }
    expect(failing).toHaveBeenCalledTimes(5);
    expect(gw.isOpen("p")).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("circuit opened"), expect.anything());
    // while open: no upstream calls, stale cache still served
    await gw.get(req(failing));
    expect(failing).toHaveBeenCalledTimes(5);
    await expect(gw.get(req(failing, { key: "uncached" }))).rejects.toMatchObject({ reason: "circuit_open" });
    advance(61_000);
    expect(gw.isOpen("p")).toBe(false);
  });

  it("daily cost brake stops upstream calls and logs a warning", async () => {
    const { gw, logger } = setup({ dailyLimits: { p: 2 } });
    const fetcher = vi.fn(async () => 1);
    await gw.get(req(fetcher, { key: "a" }));
    await gw.get(req(fetcher, { key: "b" }));
    const err = await gw.get(req(fetcher, { key: "c" })).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderUnavailableError);
    expect(err.reason).toBe("quota_exceeded");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("daily provider limit"), expect.anything());
    // cached keys are still served
    expect((await gw.get(req(fetcher, { key: "a" }))).data).toBe(1);
  });

  it("wraps upstream errors", async () => {
    const { gw } = setup();
    await expect(gw.get(req(async () => Promise.reject(new Error("x"))))).rejects.toMatchObject({
      reason: "upstream_error",
    });
  });
});

describe("DataGateway manual refresh", () => {
  it("refetches cached data that is older than forceMinAgeMs, serves younger data as is", async () => {
    const { gw, advance } = setup();
    let n = 0;
    const fetcher = vi.fn(async () => ({ n: ++n }));
    await gw.get(req(fetcher));
    advance(30_000);
    const tooYoung = await gw.get({ ...req(fetcher), forceMinAgeMs: 60_000 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(tooYoung.data).toEqual({ n: 1 });
    advance(31_000); // 61 s old, still inside the 60 s TTL window? TTL is 60 s -> expired, forced anyway
    const forced = await gw.get({ ...req(fetcher), forceMinAgeMs: 60_000 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(forced).toMatchObject({ data: { n: 2 }, stale: false });
  });

  it("forced refresh inside the TTL still refetches once the minimum age is reached", async () => {
    const { gw, advance } = setup();
    let n = 0;
    const fetcher = vi.fn(async () => ({ n: ++n }));
    await gw.get({ ...req(fetcher), ttlMs: 600_000 });
    advance(20_000);
    const forced = await gw.get({ ...req(fetcher), ttlMs: 600_000, forceMinAgeMs: 10_000 });
    expect(forced.data).toEqual({ n: 2 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("falls back to the cached copy when the forced refetch fails (and does not retry twice)", async () => {
    const { gw, advance } = setup();
    let fail = false;
    const fetcher = vi.fn(async () => {
      if (fail) throw new Error("upstream down");
      return { ok: 1 };
    });
    await gw.get({ ...req(fetcher), ttlMs: 600_000 });
    advance(120_000);
    fail = true;
    const res = await gw.get({ ...req(fetcher), ttlMs: 600_000, forceMinAgeMs: 60_000 });
    expect(res.data).toEqual({ ok: 1 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
