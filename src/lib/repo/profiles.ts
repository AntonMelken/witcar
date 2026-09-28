import { toIso, type Db } from "@/lib/db/types";

export type Theme = "auto" | "dark" | "light";

export interface Profile {
  id: string;
  displayName: string | null;
  locale: "de" | "en";
  theme: Theme;
  vehiclePreset: string;
  safetyAckAt: string | null;
  onboardedAt: string | null;
  createdAt: string;
}

interface Row {
  id: string;
  display_name: string | null;
  locale: "de" | "en";
  theme: Theme;
  vehicle_preset: string;
  safety_ack_at: Date | null;
  onboarded_at: Date | null;
  created_at: Date;
}

const map = (r: Row): Profile => ({
  id: r.id,
  displayName: r.display_name,
  locale: r.locale,
  theme: r.theme,
  vehiclePreset: r.vehicle_preset,
  safetyAckAt: toIso(r.safety_ack_at),
  onboardedAt: toIso(r.onboarded_at),
  createdAt: toIso(r.created_at)!,
});

export async function getProfile(db: Db, userId: string): Promise<Profile | null> {
  const rows = await db.query<Row>("select * from public.profiles where id = $1", [userId]);
  return rows[0] ? map(rows[0]) : null;
}

/** Profiles are created by the auth trigger; this is a safety net. */
export async function ensureProfile(db: Db, userId: string): Promise<Profile> {
  await db.query("insert into public.profiles (id) values ($1) on conflict do nothing", [userId]);
  await db.query("insert into public.subscriptions (user_id) values ($1) on conflict do nothing", [userId]);
  return (await getProfile(db, userId))!;
}

export interface ProfilePatch {
  displayName?: string | null;
  locale?: "de" | "en";
  theme?: Theme;
  vehiclePreset?: string;
  safetyAck?: boolean;
  onboarded?: boolean;
}

export async function updateProfile(db: Db, userId: string, patch: ProfilePatch): Promise<Profile | null> {
  const sets: string[] = [];
  const params: unknown[] = [userId];
  const add = (col: string, value: unknown) => {
    params.push(value);
    sets.push(`${col} = $${params.length}`);
  };
  if (patch.displayName !== undefined) add("display_name", patch.displayName);
  if (patch.locale !== undefined) add("locale", patch.locale);
  if (patch.theme !== undefined) add("theme", patch.theme);
  if (patch.vehiclePreset !== undefined) add("vehicle_preset", patch.vehiclePreset);
  if (patch.safetyAck) sets.push("safety_ack_at = coalesce(safety_ack_at, now())");
  if (patch.onboarded) sets.push("onboarded_at = coalesce(onboarded_at, now())");
  if (sets.length === 0) return getProfile(db, userId);
  const rows = await db.query<Row>(`update public.profiles set ${sets.join(", ")} where id = $1 returning *`, params);
  return rows[0] ? map(rows[0]) : null;
}
