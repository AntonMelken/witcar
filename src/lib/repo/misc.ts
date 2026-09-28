import { json, toIso, type Db } from "@/lib/db/types";

export type ConsentKind = "withdrawal_waiver" | "safety_notice";

export async function recordConsent(db: Db, userId: string, kind: ConsentKind, textVersion: string): Promise<void> {
  await db.query("insert into public.consents (user_id, kind, text_version) values ($1, $2, $3)", [
    userId,
    kind,
    textVersion,
  ]);
}

export async function listConsents(db: Db, userId: string) {
  const rows = await db.query<{ kind: ConsentKind; text_version: string; accepted_at: Date }>(
    "select kind, text_version, accepted_at from public.consents where user_id = $1 order by accepted_at",
    [userId],
  );
  return rows.map((r) => ({ kind: r.kind, textVersion: r.text_version, acceptedAt: toIso(r.accepted_at) }));
}

export type TriState = "yes" | "no" | "partial" | "unknown";

export interface IncarReportInput {
  model: string;
  softwareVersion: string;
  region: string;
  buildYear: number | null;
  visibleWhileDriving: TriState;
  counterKeptRunning: TriState;
  networkActive: TriState;
  notes: string;
  userAgent: string;
  viewport: { w: number; h: number };
  devicePixelRatio: number;
  measurements: Record<string, unknown>;
}

export async function insertIncarReport(db: Db, r: IncarReportInput): Promise<string> {
  const rows = await db.query<{ id: string }>(
    `insert into public.incar_reports
      (model, software_version, region, build_year, visible_while_driving, counter_kept_running,
       network_active, notes, user_agent, viewport_w, viewport_h, device_pixel_ratio, measurements)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb) returning id`,
    [
      r.model,
      r.softwareVersion,
      r.region,
      r.buildYear,
      r.visibleWhileDriving,
      r.counterKeptRunning,
      r.networkActive,
      r.notes,
      r.userAgent,
      r.viewport.w,
      r.viewport.h,
      r.devicePixelRatio,
      json(r.measurements),
    ],
  );
  return rows[0]!.id;
}

/** Full personal data export (GDPR Art. 15/20). Never includes token hashes. */
export async function exportAccount(db: Db, userId: string) {
  const [profile] = await db.query("select * from public.profiles where id = $1", [userId]);
  const layouts = await db.query(
    "select id, name, preset, mode, grid, is_default, created_at, updated_at from public.layouts where user_id = $1",
    [userId],
  );
  const widgetConfigs = await db.query(
    `select wc.layout_id, wc.widget_id, wc.type, wc.config, wc.created_at from public.widget_configs wc
     join public.layouts l on l.id = wc.layout_id where l.user_id = $1`,
    [userId],
  );
  const devices = await db.query(
    "select id, label, preset, last_seen_at, revoked_at, created_at from public.devices where user_id = $1",
    [userId],
  );
  const [subscription] = await db.query(
    "select plan, status, current_period_end, cancel_at_period_end, updated_at from public.subscriptions where user_id = $1",
    [userId],
  );
  const consents = await listConsents(db, userId);
  return {
    exportedAt: new Date().toISOString(),
    profile: profile ?? null,
    layouts,
    widgetConfigs,
    devices,
    subscription: subscription ?? null,
    consents,
  };
}

/** Removes the auth user; all app data cascades (ON DELETE CASCADE). */
export async function deleteAuthUserRow(db: Db, userId: string): Promise<void> {
  await db.query("delete from auth.users where id = $1", [userId]);
}
