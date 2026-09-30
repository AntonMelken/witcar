import type { ProviderResult } from "@/widgets/types";
import type { KV } from "./kv";

/**
 * Central data gateway (masterplan §11.3):
 * - shared cache: one upstream call serves every user with the same params
 * - stale-while-revalidate: expired data is returned immediately and refreshed in the background
 * - request coalescing: concurrent misses on one key trigger a single upstream call
 * - circuit breaker per provider: after repeated failures only cache is served for 60 s
 * - daily cost brake per provider: above the limit only cache is served (+ log warning)
 * - manual refresh (forceMinAgeMs): cached data older than the minimum age is refetched right away,
 *   younger data is served as is, so a refresh button cannot exhaust a provider's quota
 */

export class ProviderUnavailableError extends Error {
  constructor(
    public readonly provider: string,
    public readonly reason: "circuit_open" | "quota_exceeded" | "upstream_error" | "disabled" | "unsupported",
    cause?: unknown,
  ) {
    super(`${provider}: ${reason}`, { cause });
    this.name = "ProviderUnavailableError";
  }
}

interface Entry<T> {
  data: T;
  fetchedAt: number;
  expiresAt: number;
  source: string;
}

interface BreakerState {
  failures: number[];
  openUntil: number;
}

export interface GatewayOptions {
  now?: () => number;
  dailyLimits?: Record<string, number>;
  breakerThreshold?: number;
  breakerWindowMs?: number;
  breakerOpenMs?: number;
  upstreamTimeoutMs?: number;
  logger?: Pick<Console, "warn" | "error">;
}

export interface GatewayRequest<T> {
  provider: string;
  key: string;
  ttlMs: number;
  /** how long stale data stays usable after expiry */
  maxStaleMs: number;
  fetcher: (signal: AbortSignal) => Promise<T>;
  /** schedule a background promise (e.g. next/server `after`) */
  background?: (task: Promise<unknown>) => void;
  /** manual refresh: refetch now when the cached copy is at least this old (ms) */
  forceMinAgeMs?: number;
}

export class DataGateway {
  private inflight = new Map<string, Promise<Entry<unknown>>>();
  private breakers = new Map<string, BreakerState>();
  private warnedQuota = new Set<string>();
  private readonly now: () => number;
  private readonly opts: Required<Omit<GatewayOptions, "now" | "dailyLimits">> & {
    dailyLimits: Record<string, number>;
  };

  constructor(
    private kv: KV,
    options: GatewayOptions = {},
  ) {
    this.now = options.now ?? Date.now;
    this.opts = {
      dailyLimits: options.dailyLimits ?? {},
      breakerThreshold: options.breakerThreshold ?? 5,
      breakerWindowMs: options.breakerWindowMs ?? 60_000,
      breakerOpenMs: options.breakerOpenMs ?? 60_000,
      upstreamTimeoutMs: options.upstreamTimeoutMs ?? 8_000,
      logger: options.logger ?? console,
    };
  }

  async get<T>(req: GatewayRequest<T>): Promise<ProviderResult<T>> {
    const cached = await this.read<T>(req.key);
    const now = this.now();
    const forced = !!cached && req.forceMinAgeMs !== undefined && now - cached.fetchedAt >= req.forceMinAgeMs;
    let attempted = false;
    if (cached && forced) {
      attempted = true;
      try {
        const fresh = await this.refresh(req);
        return {
          data: fresh.data as T,
          fetchedAt: new Date(fresh.fetchedAt).toISOString(),
          source: fresh.source,
          stale: false,
        };
      } catch {
        // provider down or over quota: keep serving what we have
      }
    }
    if (cached && now < cached.expiresAt) {
      return {
        data: cached.data,
        fetchedAt: new Date(cached.fetchedAt).toISOString(),
        source: cached.source,
        stale: false,
      };
    }
    if (cached) {
      // stale-while-revalidate: answer now, refresh in the background
      if (!attempted && !this.isOpen(req.provider)) {
        const task = this.refresh(req).catch(() => undefined);
        if (req.background) req.background(task);
      }
      return {
        data: cached.data,
        fetchedAt: new Date(cached.fetchedAt).toISOString(),
        source: cached.source,
        stale: true,
      };
    }
    const fresh = await this.refresh(req);
    return {
      data: fresh.data as T,
      fetchedAt: new Date(fresh.fetchedAt).toISOString(),
      source: fresh.source,
      stale: false,
    };
  }

  isOpen(provider: string): boolean {
    const b = this.breakers.get(provider);
    return !!b && b.openUntil > this.now();
  }

  private async read<T>(key: string): Promise<Entry<T> | null> {
    try {
      const raw = await this.kv.get(`data:${key}`);
      return raw ? (JSON.parse(raw) as Entry<T>) : null;
    } catch (err) {
      this.opts.logger.warn("[gateway] cache read failed", { key, err: String(err) });
      return null;
    }
  }

  /** Coalesced upstream refresh. The inflight entry is set synchronously. */
  private refresh<T>(req: GatewayRequest<T>): Promise<Entry<unknown>> {
    const existing = this.inflight.get(req.key);
    if (existing) return existing;
    const task = this.doRefresh(req).finally(() => this.inflight.delete(req.key));
    this.inflight.set(req.key, task);
    return task;
  }

  private async doRefresh<T>(req: GatewayRequest<T>): Promise<Entry<unknown>> {
    if (this.isOpen(req.provider)) throw new ProviderUnavailableError(req.provider, "circuit_open");
    await this.checkQuota(req.provider);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.opts.upstreamTimeoutMs);
    try {
      const data = await req.fetcher(controller.signal);
      const now = this.now();
      const entry: Entry<T> = { data, fetchedAt: now, expiresAt: now + req.ttlMs, source: req.provider };
      const kvTtlSec = Math.ceil((req.ttlMs + req.maxStaleMs) / 1000);
      await this.kv.set(`data:${req.key}`, JSON.stringify(entry), kvTtlSec).catch((err) => {
        this.opts.logger.warn("[gateway] cache write failed", { key: req.key, err: String(err) });
      });
      this.breakers.delete(req.provider);
      return entry;
    } catch (err) {
      // our own rate limiter saying "later" is no sign of a broken provider
      if (!(err instanceof ProviderUnavailableError && err.reason === "quota_exceeded")) {
        this.recordFailure(req.provider);
      }
      if (err instanceof ProviderUnavailableError) throw err;
      throw new ProviderUnavailableError(req.provider, "upstream_error", err);
    } finally {
      clearTimeout(timer);
    }
  }

  private async checkQuota(provider: string): Promise<void> {
    const limit = this.opts.dailyLimits[provider];
    if (!limit) return;
    const day = new Date(this.now()).toISOString().slice(0, 10);
    const key = `quota:${provider}:${day}`;
    const used = await this.kv.incr(key, 2 * 24 * 3600);
    if (used > limit) {
      if (!this.warnedQuota.has(key)) {
        this.warnedQuota.add(key);
        this.opts.logger.warn("[gateway] daily provider limit reached, serving cache only", { provider, limit });
      }
      throw new ProviderUnavailableError(provider, "quota_exceeded");
    }
  }

  private recordFailure(provider: string): void {
    const now = this.now();
    const state = this.breakers.get(provider) ?? { failures: [], openUntil: 0 };
    state.failures = state.failures.filter((t) => now - t < this.opts.breakerWindowMs);
    state.failures.push(now);
    if (state.failures.length >= this.opts.breakerThreshold) {
      state.openUntil = now + this.opts.breakerOpenMs;
      state.failures = [];
      this.opts.logger.warn("[gateway] circuit opened", { provider, openMs: this.opts.breakerOpenMs });
    }
    this.breakers.set(provider, state);
  }
}
