import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/types";
import { asUser, createUser, testDb } from "./helpers/db";

/**
 * RLS tests (masterplan §0.3/§7): every table has RLS and user A can never
 * read or write user B's rows through the public API roles.
 */
let db: Db;
let pg: PGlite;
let alice: string;
let bob: string;
let bobLayout: string;

beforeAll(async () => {
  ({ db, pg } = await testDb());
  alice = await createUser(db, "alice@example.com");
  bob = await createUser(db, "bob@example.com");
  const [l] = await db.query<{ id: string }>(
    "insert into public.layouts (user_id, name, preset, grid) values ($1, 'B', 'generic-landscape', '[]') returning id",
    [bob],
  );
  bobLayout = l!.id;
  await db.query(
    "insert into public.widget_configs (layout_id, widget_id, type, config) values ($1, 'w1', 'clock', '{}')",
    [bobLayout],
  );
  await db.query("insert into public.devices (user_id, token_hash) values ($1, 'hash-b')", [bob]);
  await db.query("insert into public.consents (user_id, kind, text_version) values ($1, 'safety_notice', 'v1')", [bob]);
  await db.query(
    "insert into public.device_codes (device_code_hash, user_code, expires_at) values ('dc', 'ABCDEFGH', now() + interval '10 minutes')",
  );
  await db.query("insert into public.stripe_events (id, type) values ('evt_1', 'x')");
  await db.query("insert into public.api_cache (key, value, expires_at) values ('k', '{}', now() + interval '1 hour')");
  await db.query("insert into public.incar_reports (model) values ('m')");
});

describe("RLS", () => {
  it("every public table has RLS enabled", async () => {
    const rows = await db.query<{ relname: string; relrowsecurity: boolean }>(
      "select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'",
    );
    expect(rows.length).toBeGreaterThanOrEqual(10);
    for (const r of rows) expect(r.relrowsecurity, r.relname).toBe(true);
  });

  it("profiles/subscriptions are created by the auth trigger", async () => {
    const [p] = await db.query("select * from public.profiles where id = $1", [alice]);
    const [s] = await db.query<{ plan: string }>("select * from public.subscriptions where user_id = $1", [alice]);
    expect(p).toBeTruthy();
    expect(s!.plan).toBe("free");
  });

  it("users only see their own rows", async () => {
    await asUser(pg, alice, async (q) => {
      for (const table of ["profiles", "layouts", "widget_configs", "devices", "subscriptions", "consents"]) {
        const rows = (await q(`select * from public.${table}`)) as Record<string, unknown>[];
        for (const r of rows) expect(r.user_id ?? r.id, table).toBe(alice);
        if (table === "widget_configs") expect(rows).toHaveLength(0);
      }
    });
    await asUser(pg, bob, async (q) => {
      expect(await q("select * from public.layouts")).toHaveLength(1);
      expect(await q("select * from public.widget_configs")).toHaveLength(1);
      expect(await q("select * from public.devices")).toHaveLength(1);
    });
  });

  it("foreign rows cannot be modified or deleted", async () => {
    await asUser(pg, alice, async (q) => {
      await q("update public.layouts set name = 'hacked' where id = $1", [bobLayout]);
      await q("delete from public.widget_configs where layout_id = $1", [bobLayout]);
      await q("update public.devices set revoked_at = now() where user_id = $1", [bob]);
      await q("update public.profiles set theme = 'light' where id = $1", [bob]);
    });
    const [l] = await db.query<{ name: string }>("select name from public.layouts where id = $1", [bobLayout]);
    expect(l!.name).toBe("B");
    expect(await db.query("select * from public.widget_configs where layout_id = $1", [bobLayout])).toHaveLength(1);
    const [d] = await db.query<{ revoked_at: Date | null }>(
      "select revoked_at from public.devices where user_id = $1",
      [bob],
    );
    expect(d!.revoked_at).toBeNull();
  });

  it("foreign rows cannot be inserted", async () => {
    await expect(
      asUser(pg, alice, (q) => q("insert into public.layouts (user_id, name, preset) values ($1, 'x', 'p')", [bob])),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asUser(pg, alice, (q) =>
        q("insert into public.widget_configs (layout_id, widget_id, type) values ($1, 'evil', 'clock')", [bobLayout]),
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      asUser(pg, alice, (q) => q("insert into public.devices (user_id, token_hash) values ($1, 'h2')", [bob])),
    ).rejects.toThrow(/row-level security/);
  });

  it("subscriptions are read-only for users (webhook/service role only)", async () => {
    await asUser(pg, alice, (q) => q("update public.subscriptions set plan = 'pro' where user_id = $1", [alice]));
    const [s] = await db.query<{ plan: string }>("select plan from public.subscriptions where user_id = $1", [alice]);
    expect(s!.plan).toBe("free");
    await expect(
      asUser(pg, alice, (q) =>
        q("insert into public.consents (user_id, kind, text_version) values ($1, 'safety_notice', 'x')", [alice]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("internal tables are invisible to anon and authenticated", async () => {
    for (const who of [alice, null]) {
      await asUser(pg, who, async (q) => {
        for (const table of ["device_codes", "stripe_events", "api_cache", "incar_reports"]) {
          expect(await q(`select * from public.${table}`), table).toHaveLength(0);
        }
      });
    }
    await expect(asUser(pg, null, (q) => q("insert into public.incar_reports (model) values ('x')"))).rejects.toThrow(
      /row-level security/,
    );
  });

  it("anon sees no user data", async () => {
    await asUser(pg, null, async (q) => {
      for (const table of ["profiles", "layouts", "widget_configs", "devices", "subscriptions", "consents"]) {
        expect(await q(`select * from public.${table}`), table).toHaveLength(0);
      }
    });
  });

  it("deleting the auth user cascades all personal data", async () => {
    const carol = await createUser(db, "carol@example.com");
    await db.query("insert into public.layouts (user_id, name, preset) values ($1, 'C', 'p')", [carol]);
    await db.query("delete from auth.users where id = $1", [carol]);
    for (const [table, col] of [
      ["profiles", "id"],
      ["layouts", "user_id"],
      ["subscriptions", "user_id"],
    ]) {
      expect(await db.query(`select 1 from public.${table} where ${col} = $1`, [carol]), table).toHaveLength(0);
    }
  });
});
