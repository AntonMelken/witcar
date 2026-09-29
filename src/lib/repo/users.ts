import type { Db } from "@/lib/db/types";

/**
 * Car-only account without e-mail ("Sofort starten" in the car). Inserted like a
 * Supabase anonymous user; it never signs in through Supabase Auth, only via
 * the device token. The on_auth_user_created trigger adds profile + subscription.
 */
export async function createCarUser(db: Db): Promise<string> {
  const rows = await db.query<{ id: string }>(
    `insert into auth.users
       (id, instance_id, aud, role, is_anonymous, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
     values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', true,
             now(), now(), '{"provider":"witcar_car"}'::jsonb, '{}'::jsonb)
     returning id`,
  );
  return rows[0]!.id;
}
