/** Minimal SQL client used by all repositories (postgres.js in prod, PGlite locally). */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<T[]>;
  /** Runs fn inside a transaction. Nested calls reuse the outer transaction. */
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
}

/**
 * Serialize a value for a `$n::text::jsonb` parameter. The text cast matters: postgres.js would JSON-encode a
 * string a second time for a plain `$n::jsonb`, which stores a JSON string instead of the array/object.
 */
export function json(value: unknown): string {
  return JSON.stringify(value);
}

export function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}
