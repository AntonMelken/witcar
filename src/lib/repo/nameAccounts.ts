import type { Db } from "@/lib/db/types";
import { cleanName, nameEmail, nameKey } from "@/lib/auth/name";
import { ensureProfile, getProfile, updateProfile, type Profile } from "./profiles";

export interface NameAccount {
  userId: string;
  created: boolean;
  profile: Profile;
}

async function findUserId(db: Db, email: string): Promise<string | null> {
  const rows = await db.query<{ id: string }>("select id from auth.users where email = $1", [email]);
  return rows[0]?.id ?? null;
}

const isCode = (err: unknown, code: string) => (err as { code?: string }).code === code;

/** Inserts the auth row; richer columns exist on Supabase, the local stub only has id/email. */
async function insertUser(db: Db, email: string): Promise<string | null> {
  const attempts = [
    `insert into auth.users (id, aud, role, email, created_at, updated_at)
     values (gen_random_uuid(), 'authenticated', 'authenticated', $1, now(), now()) returning id`,
    "insert into auth.users (id, email) values (gen_random_uuid(), $1) returning id",
  ];
  for (const sql of attempts) {
    try {
      return (await db.query<{ id: string }>(sql, [email]))[0]?.id ?? null;
    } catch (err) {
      if (isCode(err, "23505")) return null; // created concurrently by another request
      if (!isCode(err, "42703")) throw err; // 42703: column missing (local stub) -> next variant
    }
  }
  throw new Error("could not insert into auth.users");
}

/** Finds or creates the account for a name. `name` must already be validated with cleanName(). */
export async function ensureNameAccount(db: Db, name: string): Promise<NameAccount> {
  const display = cleanName(name);
  if (!display) throw new Error("invalid name");
  const email = nameEmail(nameKey(display));
  let userId = await findUserId(db, email);
  let created = false;
  if (!userId) {
    userId = await insertUser(db, email);
    created = userId !== null;
    userId ??= await findUserId(db, email);
    if (!userId) throw new Error("could not create account");
  }
  let profile = await ensureProfile(db, userId);
  if (created || !profile.displayName) {
    // new accounts start with the white design; the stored name is the one as typed first
    profile =
      (await updateProfile(db, userId, { displayName: display, theme: created ? "light" : undefined })) ?? profile;
  }
  return { userId, created, profile: (await getProfile(db, userId)) ?? profile };
}
