import type { Db } from "@/lib/db/types";

/** Tiny key-value abstraction for the API cache and rate limits (D-010). */
export interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec: number): Promise<void>;
  /** Atomic increment by `by` (default 1); the TTL is applied when the key is created. */
  incr(key: string, ttlSec: number, by?: number): Promise<number>;
  del(key: string): Promise<void>;
}

export class MemoryKV implements KV {
  private store = new Map<string, { value: string; expiresAt: number }>();
  constructor(private now: () => number = Date.now) {}

  private live(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  async get(key: string) {
    return this.live(key)?.value ?? null;
  }

  async set(key: string, value: string, ttlSec: number) {
    this.store.set(key, { value, expiresAt: this.now() + ttlSec * 1000 });
    if (this.store.size > 20_000) this.sweep();
  }

  async incr(key: string, ttlSec: number, by = 1) {
    const entry = this.live(key);
    const next = (entry ? Number.parseInt(entry.value, 10) || 0 : 0) + by;
    this.store.set(key, { value: String(next), expiresAt: entry?.expiresAt ?? this.now() + ttlSec * 1000 });
    return next;
  }

  async del(key: string) {
    this.store.delete(key);
  }

  private sweep() {
    const now = this.now();
    for (const [k, v] of this.store) if (v.expiresAt <= now) this.store.delete(k);
  }
}

/** Production KV on the Postgres table public.api_cache (D-010). */
export class PostgresKV implements KV {
  constructor(
    private getDb: () => Promise<Db>,
    private sweepChance = 0.01,
  ) {}

  /** get() ignores expired rows; every ~100th write deletes them so the table stays small. */
  private async maybeSweep(db: Db) {
    if (Math.random() >= this.sweepChance) return;
    await db.query("delete from public.api_cache where expires_at < now()").catch(() => undefined);
  }

  async get(key: string) {
    const db = await this.getDb();
    const rows = await db.query<{ v: string }>(
      "select value->>'v' as v from public.api_cache where key = $1 and expires_at > now()",
      [key],
    );
    return rows[0]?.v ?? null;
  }

  async set(key: string, value: string, ttlSec: number) {
    const db = await this.getDb();
    await db.query(
      `insert into public.api_cache (key, value, expires_at)
       values ($1, jsonb_build_object('v', $2::text), now() + make_interval(secs => $3))
       on conflict (key) do update set value = excluded.value, expires_at = excluded.expires_at`,
      [key, value, ttlSec],
    );
    await this.maybeSweep(db);
  }

  async incr(key: string, ttlSec: number, by = 1) {
    const db = await this.getDb();
    const rows = await db.query<{ n: number }>(
      `insert into public.api_cache (key, value, expires_at)
       values ($1, jsonb_build_object('v', $3::int::text), now() + make_interval(secs => $2))
       on conflict (key) do update set
         value = case when public.api_cache.expires_at <= now() then jsonb_build_object('v', $3::int::text)
                 else jsonb_build_object('v', ((public.api_cache.value->>'v')::int + $3::int)::text) end,
         expires_at = case when public.api_cache.expires_at <= now() then excluded.expires_at
                      else public.api_cache.expires_at end
       returning (value->>'v')::int as n`,
      [key, ttlSec, by],
    );
    await this.maybeSweep(db);
    return rows[0]?.n ?? by;
  }

  async del(key: string) {
    const db = await this.getDb();
    await db.query("delete from public.api_cache where key = $1", [key]);
  }
}
