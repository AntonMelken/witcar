import "server-only";
import { getEnv } from "@/lib/env";
import type { Db } from "./types";

export type { Db } from "./types";
export { json, toIso } from "./types";

type GlobalWithDb = typeof globalThis & { __witcarDb?: Promise<Db> };
const g = globalThis as GlobalWithDb;

async function createPostgresDb(url: string): Promise<Db> {
  const { default: postgres } = await import("postgres");
  // Supabase pooler (transaction mode) does not support prepared statements.
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const sql = postgres(url, {
    prepare: false,
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: local ? false : "require",
  });
  // postgres.js generics are stricter than our minimal interface
  type Unsafe = { unsafe: (text: string, params?: never[]) => PromiseLike<unknown> };
  const wrap = (q: Unsafe, isTx: boolean): Db => ({
    async query<T>(text: string, params: readonly unknown[] = []) {
      return (await q.unsafe(text, params as never[])) as T[];
    },
    async tx<T>(fn: (db: Db) => Promise<T>) {
      if (isTx) return fn(wrap(q, true));
      return sql.begin((tx) => fn(wrap(tx as unknown as Unsafe, true))) as Promise<T>;
    },
  });
  return wrap(sql as unknown as Unsafe, false);
}

async function createDb(): Promise<Db> {
  const env = getEnv();
  if (env.WITCAR_DB === "postgres") {
    return createPostgresDb(env.DATABASE_URL!);
  }
  const { createPgliteDb } = await import("./pglite");
  const { db } = await createPgliteDb(env.PGLITE_DATA_DIR);
  return db;
}

export function getDb(): Promise<Db> {
  if (!g.__witcarDb) {
    g.__witcarDb = createDb().catch((err) => {
      g.__witcarDb = undefined;
      throw err;
    });
  }
  return g.__witcarDb;
}
