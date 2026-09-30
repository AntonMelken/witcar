import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/types";
import { ensureNameAccount } from "@/lib/repo/nameAccounts";
import { testDb } from "./helpers/db";

let db: Db;

beforeAll(async () => {
  ({ db } = await testDb());
});

describe("name accounts", () => {
  it("creates an account for a new name with the white design", async () => {
    const a = await ensureNameAccount(db, "Anton Melken");
    expect(a.created).toBe(true);
    expect(a.profile.displayName).toBe("Anton Melken");
    expect(a.profile.theme).toBe("light");
    expect(a.profile.onboardedAt).toBeNull();
  });

  it("returns the same account for the same name, ignoring case and spacing", async () => {
    const first = await ensureNameAccount(db, "Sabine");
    const again = await ensureNameAccount(db, "  sabine ");
    expect(again.created).toBe(false);
    expect(again.userId).toBe(first.userId);
    expect(again.profile.displayName).toBe("Sabine");
  });

  it("keeps different names apart and rejects invalid ones", async () => {
    const a = await ensureNameAccount(db, "Erik");
    const b = await ensureNameAccount(db, "Erika");
    expect(a.userId).not.toBe(b.userId);
    await expect(ensureNameAccount(db, "<x>")).rejects.toThrow(/invalid/);
  });

  it("survives concurrent first logins with one account", async () => {
    const [x, y, z] = await Promise.all([
      ensureNameAccount(db, "Parallel"),
      ensureNameAccount(db, "Parallel"),
      ensureNameAccount(db, "Parallel"),
    ]);
    expect(new Set([x.userId, y.userId, z.userId]).size).toBe(1);
    const rows = await db.query("select id from auth.users where email like '%@name.witcar.invalid'");
    expect(new Set(rows.map((r) => (r as { id: string }).id)).size).toBe(rows.length);
  });
});
