import type { PGlite } from "@electric-sql/pglite";
import { createPgliteDb } from "@/lib/db/pglite";
import type { Db } from "@/lib/db/types";

/** Fresh in-process Postgres with the Supabase stub + all migrations. */
export async function testDb(): Promise<{ db: Db; pg: PGlite }> {
  return createPgliteDb(undefined, process.cwd());
}

export async function createUser(db: Db, email: string): Promise<string> {
  const [row] = await db.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email]);
  return row!.id;
}

/** Runs fn as the Supabase `authenticated` role with auth.uid() = userId (RLS applies). */
export async function asUser<T>(
  pg: PGlite,
  userId: string | null,
  fn: (q: (sql: string, params?: unknown[]) => Promise<unknown[]>) => Promise<T>,
): Promise<T> {
  return pg.transaction(async (tx) => {
    await tx.query(`set local role ${userId ? "authenticated" : "anon"}`);
    if (userId) await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    return fn(async (sql, params) => (await tx.query(sql, params)).rows);
  });
}
