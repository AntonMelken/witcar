import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { PGlite, Transaction } from "@electric-sql/pglite";
import type { Db } from "./types";

type Queryable = Pick<PGlite, "query"> | Transaction;

function wrap(q: Queryable, root: PGlite | null): Db {
  return {
    async query<T>(sql: string, params: readonly unknown[] = []) {
      const res = await q.query<T>(sql, params as unknown[]);
      return res.rows;
    },
    async tx<T>(fn: (db: Db) => Promise<T>) {
      if (!root) return fn(wrap(q, null));
      return root.transaction((tx) => fn(wrap(tx, null)));
    },
  };
}

export function migrationFiles(projectRoot = process.cwd()): string[] {
  const stubDir = path.join(projectRoot, "supabase", "local");
  const migDir = path.join(projectRoot, "supabase", "migrations");
  const list = (dir: string) =>
    readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((f) => path.join(dir, f));
  return [...list(stubDir), ...list(migDir)];
}

/**
 * Creates an in-process Postgres with the Supabase stub + all migrations applied.
 * dataDir persists between restarts (local dev); omit it for an ephemeral DB.
 */
export async function createPgliteDb(dataDir?: string, projectRoot?: string): Promise<{ db: Db; pg: PGlite }> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = dataDir ? new PGlite(dataDir) : new PGlite();
  await pg.waitReady;
  await pg.exec(
    "create schema if not exists local_meta; create table if not exists local_meta.migrations (name text primary key, applied_at timestamptz not null default now());",
  );
  const applied = new Set(
    (await pg.query<{ name: string }>("select name from local_meta.migrations")).rows.map((r) => r.name),
  );
  for (const file of migrationFiles(projectRoot)) {
    const name = path.basename(file);
    if (applied.has(name)) continue;
    const sql = readFileSync(file, "utf8");
    await pg.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query("insert into local_meta.migrations (name) values ($1)", [name]);
    });
  }
  return { db: wrap(pg, pg), pg };
}
