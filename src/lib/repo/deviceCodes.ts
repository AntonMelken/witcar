import { toIso, type Db } from "@/lib/db/types";

export type DeviceCodeStatus = "pending" | "approved" | "expired" | "consumed";

export interface DeviceCode {
  id: string;
  userCode: string;
  userId: string | null;
  label: string | null;
  preset: string | null;
  status: DeviceCodeStatus;
  expiresAt: string;
}

interface Row {
  id: string;
  user_code: string;
  user_id: string | null;
  label: string | null;
  preset: string | null;
  status: DeviceCodeStatus;
  expires_at: Date;
}

const map = (r: Row): DeviceCode => ({
  id: r.id,
  userCode: r.user_code,
  userId: r.user_id,
  label: r.label,
  preset: r.preset,
  // report time-based expiry even before a cleanup job flips the status
  status: r.status === "pending" && r.expires_at.getTime() <= Date.now() ? "expired" : r.status,
  expiresAt: toIso(r.expires_at)!,
});

export async function createDeviceCode(
  db: Db,
  input: { deviceCodeHash: string; userCode: string; preset: string | null; ttlSeconds: number },
): Promise<DeviceCode> {
  // opportunistic cleanup of old codes
  await db.query("delete from public.device_codes where expires_at < now() - interval '1 day'");
  const rows = await db.query<Row>(
    `insert into public.device_codes (device_code_hash, user_code, preset, expires_at)
     values ($1, $2, $3, now() + make_interval(secs => $4)) returning *`,
    [input.deviceCodeHash, input.userCode, input.preset, input.ttlSeconds],
  );
  return map(rows[0]!);
}

export async function findByDeviceCodeHash(db: Db, hash: string): Promise<DeviceCode | null> {
  const rows = await db.query<Row>("select * from public.device_codes where device_code_hash = $1", [hash]);
  return rows[0] ? map(rows[0]) : null;
}

export async function findByUserCode(db: Db, userCode: string): Promise<DeviceCode | null> {
  const rows = await db.query<Row>("select * from public.device_codes where user_code = $1", [userCode]);
  return rows[0] ? map(rows[0]) : null;
}

/** pending + unexpired -> approved (by userId). Returns false otherwise. */
export async function approveDeviceCode(
  db: Db,
  userCode: string,
  userId: string,
  label: string | null,
): Promise<boolean> {
  const rows = await db.query<{ id: string }>(
    `update public.device_codes set status = 'approved', user_id = $2, label = $3
     where user_code = $1 and status = 'pending' and expires_at > now() returning id`,
    [userCode, userId, label],
  );
  return rows.length > 0;
}

/** approved -> consumed, atomically. Only one poller can win. */
export async function consumeDeviceCode(db: Db, id: string): Promise<DeviceCode | null> {
  const rows = await db.query<Row>(
    `update public.device_codes set status = 'consumed'
     where id = $1 and status = 'approved' returning *`,
    [id],
  );
  return rows[0] ? map(rows[0]) : null;
}
