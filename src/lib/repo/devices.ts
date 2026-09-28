import { toIso, type Db } from "@/lib/db/types";

export const DEVICE_SESSION_DAYS = 90;

export interface Device {
  id: string;
  userId: string;
  label: string | null;
  preset: string | null;
  lastSeenAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface Row {
  id: string;
  user_id: string;
  label: string | null;
  preset: string | null;
  last_seen_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
}

const map = (r: Row): Device => ({
  id: r.id,
  userId: r.user_id,
  label: r.label,
  preset: r.preset,
  lastSeenAt: toIso(r.last_seen_at),
  revokedAt: toIso(r.revoked_at),
  createdAt: toIso(r.created_at)!,
});

export async function createDevice(
  db: Db,
  input: { userId: string; label: string | null; preset: string | null; tokenHash: string },
): Promise<Device> {
  const rows = await db.query<Row>(
    `insert into public.devices (user_id, label, preset, token_hash, last_seen_at)
     values ($1, $2, $3, $4, now()) returning *`,
    [input.userId, input.label, input.preset, input.tokenHash],
  );
  return map(rows[0]!);
}

/**
 * Active device for a token hash: not revoked and seen within the rolling
 * session window. Returns null otherwise.
 */
export async function findActiveDeviceByTokenHash(db: Db, tokenHash: string): Promise<Device | null> {
  const rows = await db.query<Row>(
    `select * from public.devices
     where token_hash = $1 and revoked_at is null
       and coalesce(last_seen_at, created_at) > now() - make_interval(days => $2)`,
    [tokenHash, DEVICE_SESSION_DAYS],
  );
  return rows[0] ? map(rows[0]) : null;
}

/** Updates last_seen_at at most every 5 minutes to limit writes. */
export async function touchDevice(db: Db, id: string): Promise<void> {
  await db.query(
    `update public.devices set last_seen_at = now()
     where id = $1 and (last_seen_at is null or last_seen_at < now() - interval '5 minutes')`,
    [id],
  );
}

export async function listDevices(db: Db, userId: string): Promise<Device[]> {
  const rows = await db.query<Row>(
    "select * from public.devices where user_id = $1 and revoked_at is null order by created_at desc",
    [userId],
  );
  return rows.map(map);
}

export async function countActiveDevices(db: Db, userId: string): Promise<number> {
  const rows = await db.query<{ n: number }>(
    `select count(*)::int as n from public.devices
     where user_id = $1 and revoked_at is null
       and coalesce(last_seen_at, created_at) > now() - make_interval(days => $2)`,
    [userId, DEVICE_SESSION_DAYS],
  );
  return rows[0]?.n ?? 0;
}

export async function revokeDevice(db: Db, userId: string, id: string): Promise<boolean> {
  const rows = await db.query<{ id: string }>(
    "update public.devices set revoked_at = now() where id = $1 and user_id = $2 and revoked_at is null returning id",
    [id, userId],
  );
  return rows.length > 0;
}
