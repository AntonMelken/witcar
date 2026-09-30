/**
 * Provider adapter contract (masterplan §11.1). Widgets never talk to a
 * provider directly; the batch route resolves a provider per data kind.
 */
export interface Provider<TIn, TOut> {
  id: string;
  ttlMs: number;
  maxStaleMs: number;
  /** cache lifetime that depends on the input (e.g. chart range); overrides ttlMs */
  ttlFor?(input: TIn): number;
  /** minimum age (ms) before a manual refresh may bypass the cache; default 120 s (protects provider quotas) */
  forceMinAgeMs?: number;
  cacheKey(input: TIn): string;
  fetch(input: TIn, signal: AbortSignal): Promise<TOut>;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

export async function getJson<T>(fetchImpl: FetchLike, url: string, init: RequestInit): Promise<T> {
  const res = await fetchImpl(url, { ...init, headers: { accept: "application/json", ...init.headers } });
  if (!res.ok) throw new UpstreamError(`upstream ${res.status}`, res.status);
  return (await res.json()) as T;
}

/** Deterministic pseudo-random in [0,1) from a string seed (mock providers). */
export function seeded(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}
