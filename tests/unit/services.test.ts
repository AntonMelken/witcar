import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/db/types";
import { PostgresKV } from "@/lib/cache/kv";
import type { LayoutWidget } from "@/lib/layout/schema";
import { findActiveDeviceByTokenHash, listDevices, revokeDevice } from "@/lib/repo/devices";
import { getDefaultLayout, getLayout } from "@/lib/repo/layouts";
import { upsertSubscription } from "@/lib/repo/subscriptions";
import { exportAccount } from "@/lib/repo/misc";
import { createLayoutForUser, saveLayoutForUser } from "@/lib/services/layouts";
import { approvePairing, pollPairing, startPairing } from "@/lib/services/pairing";
import { sha256 } from "@/lib/auth/tokens";
import { createUser, testDb } from "./helpers/db";

let db: Db;
let user: string;

const clock = (id: string, x: number, y = 0): LayoutWidget => ({
  widgetId: id,
  type: "clock",
  x,
  y,
  w: 4,
  h: 4,
  config: {},
});

beforeEach(async () => {
  ({ db } = await testDb());
  user = await createUser(db, "u@example.com");
});

async function makePro(userId: string) {
  await upsertSubscription(db, userId, { plan: "pro", status: "active" });
}

describe("layout service", () => {
  it("creates, saves and loads layouts with widget configs", async () => {
    const res = await createLayoutForUser(db, user, {
      name: "Main",
      preset: "model-3-y",
      mode: "standard",
      widgets: [{ ...clock("c1", 0), config: { showSeconds: true } }],
      makeDefault: false,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.isDefault).toBe(true);
    const saved = await saveLayoutForUser(db, user, res.value.id, {
      name: "Renamed",
      preset: "model-3-y",
      widgets: [clock("c1", 4), clock("c2", 0, 4)],
    });
    expect(saved.ok).toBe(true);
    const loaded = await getLayout(db, user, res.value.id);
    expect(loaded!.name).toBe("Renamed");
    expect(loaded!.widgets.map((w) => w.widgetId)).toEqual(["c1", "c2"]);
    expect(loaded!.widgets[0]!.config).toEqual({ showSeconds: false, timeZone: "local", label: "" });
  });

  it("enforces free limits server-side (widgets, layouts)", async () => {
    const four = [clock("a", 0), clock("b", 4), clock("c", 8), clock("d", 0, 4)];
    const tooMany = await createLayoutForUser(db, user, {
      name: "x",
      preset: "model-3-y",
      mode: "standard",
      widgets: four,
      makeDefault: true,
    });
    expect(tooMany).toMatchObject({ ok: false, code: "too_many_widgets" });
    await createLayoutForUser(db, user, {
      name: "1",
      preset: "model-3-y",
      mode: "standard",
      widgets: [],
      makeDefault: true,
    });
    const second = await createLayoutForUser(db, user, {
      name: "2",
      preset: "model-3-y",
      mode: "standard",
      widgets: [],
      makeDefault: false,
    });
    expect(second).toMatchObject({ ok: false, code: "layout_limit" });
    await makePro(user);
    expect(
      (
        await createLayoutForUser(db, user, {
          name: "2",
          preset: "model-3-y",
          mode: "standard",
          widgets: four,
          makeDefault: false,
        })
      ).ok,
    ).toBe(true);
  });

  it("downgrade keeps data: extra layouts become read-only, nothing is deleted", async () => {
    await makePro(user);
    const a = await createLayoutForUser(db, user, {
      name: "A",
      preset: "model-3-y",
      mode: "standard",
      widgets: [clock("a", 0)],
      makeDefault: true,
    });
    const b = await createLayoutForUser(db, user, {
      name: "B",
      preset: "model-3-y",
      mode: "standard",
      widgets: [clock("a", 0), clock("b", 4), clock("c", 8), clock("d", 0, 4)],
      makeDefault: false,
    });
    if (!a.ok || !b.ok) throw new Error("setup failed");
    await upsertSubscription(db, user, { plan: "free", status: "canceled" });
    expect(
      await saveLayoutForUser(db, user, b.value.id, { name: "B2", preset: "model-3-y", widgets: [] }),
    ).toMatchObject({
      ok: false,
      code: "read_only",
    });
    expect((await getLayout(db, user, b.value.id))!.widgets).toHaveLength(4);
    expect(
      (await saveLayoutForUser(db, user, a.value.id, { name: "A2", preset: "model-3-y", widgets: [clock("a", 0)] })).ok,
    ).toBe(true);
  });

  it("drive layouts are auto-arranged and limited to one per user", async () => {
    const res = await createLayoutForUser(db, user, {
      name: "Drive",
      preset: "model-3-y",
      mode: "drive",
      widgets: [clock("a", 0), clock("b", 0)],
      makeDefault: true,
    });
    expect(res.ok).toBe(true);
    const drive = await getDefaultLayout(db, user, "drive");
    expect(drive!.widgets.map(({ x, y, w, h }) => [x, y, w, h])).toEqual([
      [0, 0, 6, 8],
      [6, 0, 6, 8],
    ]);
    expect(
      await createLayoutForUser(db, user, {
        name: "D2",
        preset: "model-3-y",
        mode: "drive",
        widgets: [],
        makeDefault: false,
      }),
    ).toMatchObject({
      code: "layout_limit",
    });
  });

  it("other users cannot read or write my layouts", async () => {
    const res = await createLayoutForUser(db, user, {
      name: "Mine",
      preset: "model-3-y",
      mode: "standard",
      widgets: [],
      makeDefault: true,
    });
    if (!res.ok) throw new Error("setup failed");
    const other = await createUser(db, "other@example.com");
    expect(await getLayout(db, other, res.value.id)).toBeNull();
    expect(
      await saveLayoutForUser(db, other, res.value.id, { name: "x", preset: "model-3-y", widgets: [] }),
    ).toMatchObject({ code: "not_found" });
  });
});

describe("device pairing flow", () => {
  it("start -> approve -> poll issues exactly one device token", async () => {
    const { deviceCode, userCode } = await startPairing(db, "model-3-y");
    expect(await pollPairing(db, deviceCode)).toEqual({ status: "pending" });
    expect(await approvePairing(db, user, userCode.toLowerCase().replace(/(.{4})/, "$1-"), "Auto")).toEqual({
      ok: true,
    });
    const first = await pollPairing(db, deviceCode);
    expect(first.status).toBe("approved");
    if (first.status !== "approved") return;
    expect(first.deviceToken.length).toBeGreaterThan(30);
    const device = await findActiveDeviceByTokenHash(db, sha256(first.deviceToken));
    expect(device).toMatchObject({ userId: user, label: "Auto", preset: "model-3-y" });
    // code is single-use
    expect(await pollPairing(db, deviceCode)).toEqual({ status: "expired" });
    expect(await approvePairing(db, user, userCode, null)).toEqual({ ok: false, code: "not_found" });
    // token only stored as hash
    const rows = await db.query<{ token_hash: string }>("select token_hash from public.devices");
    expect(rows[0]!.token_hash).not.toBe(first.deviceToken);
  });

  it("revocation is effective immediately", async () => {
    const { deviceCode, userCode } = await startPairing(db, null);
    await approvePairing(db, user, userCode, null);
    const res = await pollPairing(db, deviceCode);
    if (res.status !== "approved") throw new Error("not approved");
    expect(await revokeDevice(db, user, res.deviceId)).toBe(true);
    expect(await findActiveDeviceByTokenHash(db, sha256(res.deviceToken))).toBeNull();
    expect(await listDevices(db, user)).toHaveLength(0);
  });

  it("rejects invalid, unknown and expired codes", async () => {
    expect(await approvePairing(db, user, "0000", null)).toEqual({ ok: false, code: "invalid_code" });
    expect(await approvePairing(db, user, "ABCDEFGH", null)).toEqual({ ok: false, code: "not_found" });
    const { deviceCode, userCode } = await startPairing(db, null);
    await db.query("update public.device_codes set expires_at = now() - interval '1 second'");
    expect(await approvePairing(db, user, userCode, null)).toEqual({ ok: false, code: "not_found" });
    expect(await pollPairing(db, deviceCode)).toEqual({ status: "expired" });
    expect(await pollPairing(db, "unknown-device-code-000000000000")).toEqual({ status: "expired" });
  });

  it("enforces the device limit per plan (free: 1)", async () => {
    for (let i = 0; i < 2; i++) {
      const { deviceCode, userCode } = await startPairing(db, null);
      const approved = await approvePairing(db, user, userCode, null);
      if (i === 0) {
        expect(approved.ok).toBe(true);
        await pollPairing(db, deviceCode);
      } else {
        expect(approved).toEqual({ ok: false, code: "device_limit" });
      }
    }
  });
});

describe("account export", () => {
  it("exports profile, layouts and devices without token hashes", async () => {
    await createLayoutForUser(db, user, {
      name: "Main",
      preset: "model-3-y",
      mode: "standard",
      widgets: [clock("c", 0)],
      makeDefault: true,
    });
    await db.query("insert into public.devices (user_id, token_hash) values ($1, 'secret-hash')", [user]);
    const data = await exportAccount(db, user);
    expect(data.layouts).toHaveLength(1);
    expect(data.widgetConfigs).toHaveLength(1);
    expect(JSON.stringify(data)).not.toContain("secret-hash");
  });
});

describe("PostgresKV (api_cache fallback)", () => {
  it("get/set/incr with expiry", async () => {
    const kv = new PostgresKV(async () => db);
    await kv.set("a", "hello", 60);
    expect(await kv.get("a")).toBe("hello");
    expect(await kv.incr("n", 60)).toBe(1);
    expect(await kv.incr("n", 60, 5)).toBe(6);
    await db.query("update public.api_cache set expires_at = now() - interval '1 second' where key = 'n'");
    expect(await kv.incr("n", 60)).toBe(1);
    await kv.del("a");
    expect(await kv.get("a")).toBeNull();
  });
});
