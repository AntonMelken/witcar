import { json, toIso, type Db } from "@/lib/db/types";
import type { LayoutWidget } from "@/lib/layout/schema";
import type { DashboardMode } from "@/widgets/types";

export interface LayoutSummary {
  id: string;
  name: string;
  preset: string;
  mode: DashboardMode;
  isDefault: boolean;
  widgetCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface Layout extends LayoutSummary {
  widgets: LayoutWidget[];
}

interface GridEntry {
  widgetId: string;
  type: LayoutWidget["type"];
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Row {
  id: string;
  user_id: string;
  name: string;
  preset: string;
  mode: DashboardMode;
  grid: GridEntry[];
  is_default: boolean;
  updated_at: Date;
  created_at: Date;
}

const summary = (r: Row): LayoutSummary => ({
  id: r.id,
  name: r.name,
  preset: r.preset,
  mode: r.mode,
  isDefault: r.is_default,
  widgetCount: Array.isArray(r.grid) ? r.grid.length : 0,
  updatedAt: toIso(r.updated_at)!,
  createdAt: toIso(r.created_at)!,
});

async function hydrate(db: Db, row: Row): Promise<Layout> {
  const configs = await db.query<{ widget_id: string; config: Record<string, unknown> }>(
    "select widget_id, config from public.widget_configs where layout_id = $1",
    [row.id],
  );
  const byId = new Map(configs.map((c) => [c.widget_id, c.config]));
  return {
    ...summary(row),
    widgets: (row.grid ?? []).map((g) => ({
      widgetId: g.widgetId,
      type: g.type,
      x: g.x,
      y: g.y,
      w: g.w,
      h: g.h,
      config: byId.get(g.widgetId) ?? {},
    })),
  };
}

export async function listLayouts(db: Db, userId: string): Promise<LayoutSummary[]> {
  const rows = await db.query<Row>("select * from public.layouts where user_id = $1 order by mode, created_at", [
    userId,
  ]);
  return rows.map(summary);
}

export async function countLayouts(db: Db, userId: string, mode: DashboardMode): Promise<number> {
  const rows = await db.query<{ n: number }>(
    "select count(*)::int as n from public.layouts where user_id = $1 and mode = $2",
    [userId, mode],
  );
  return rows[0]?.n ?? 0;
}

export async function getLayout(db: Db, userId: string, id: string): Promise<Layout | null> {
  const rows = await db.query<Row>("select * from public.layouts where id = $1 and user_id = $2", [id, userId]);
  return rows[0] ? hydrate(db, rows[0]) : null;
}

/** Default layout for a mode, falling back to the oldest one. */
export async function getDefaultLayout(db: Db, userId: string, mode: DashboardMode): Promise<Layout | null> {
  const rows = await db.query<Row>(
    `select * from public.layouts where user_id = $1 and mode = $2
     order by is_default desc, created_at asc limit 1`,
    [userId, mode],
  );
  return rows[0] ? hydrate(db, rows[0]) : null;
}

/** Oldest standard layout: the one that stays editable on the Free plan. */
export async function getOldestLayoutId(db: Db, userId: string, mode: DashboardMode): Promise<string | null> {
  const rows = await db.query<{ id: string }>(
    "select id from public.layouts where user_id = $1 and mode = $2 order by created_at asc, id asc limit 1",
    [userId, mode],
  );
  return rows[0]?.id ?? null;
}

async function writeWidgets(db: Db, layoutId: string, widgets: readonly LayoutWidget[]): Promise<void> {
  await db.query("delete from public.widget_configs where layout_id = $1", [layoutId]);
  for (const w of widgets) {
    await db.query(
      "insert into public.widget_configs (layout_id, widget_id, type, config) values ($1, $2, $3, $4::text::jsonb)",
      [layoutId, w.widgetId, w.type, json(w.config ?? {})],
    );
  }
}

const gridOf = (widgets: readonly LayoutWidget[]): GridEntry[] =>
  widgets.map(({ widgetId, type, x, y, w, h }) => ({ widgetId, type, x, y, w, h }));

export interface CreateLayoutInput {
  name: string;
  preset: string;
  mode: DashboardMode;
  widgets: readonly LayoutWidget[];
  makeDefault: boolean;
}

export async function createLayout(db: Db, userId: string, input: CreateLayoutInput): Promise<Layout> {
  return db.tx(async (tx) => {
    const existing = await countLayouts(tx, userId, input.mode);
    const makeDefault = input.makeDefault || existing === 0;
    if (makeDefault) {
      await tx.query("update public.layouts set is_default = false where user_id = $1 and mode = $2", [
        userId,
        input.mode,
      ]);
    }
    const rows = await tx.query<Row>(
      `insert into public.layouts (user_id, name, preset, mode, grid, is_default)
       values ($1, $2, $3, $4, $5::text::jsonb, $6) returning *`,
      [userId, input.name, input.preset, input.mode, json(gridOf(input.widgets)), makeDefault],
    );
    const row = rows[0]!;
    await writeWidgets(tx, row.id, input.widgets);
    return hydrate(tx, row);
  });
}

export async function saveLayout(
  db: Db,
  userId: string,
  id: string,
  input: { name: string; preset: string; widgets: readonly LayoutWidget[] },
): Promise<Layout | null> {
  return db.tx(async (tx) => {
    const rows = await tx.query<Row>(
      `update public.layouts set name = $3, preset = $4, grid = $5::text::jsonb
       where id = $1 and user_id = $2 returning *`,
      [id, userId, input.name, input.preset, json(gridOf(input.widgets))],
    );
    if (!rows[0]) return null;
    await writeWidgets(tx, id, input.widgets);
    return hydrate(tx, rows[0]);
  });
}

export async function deleteLayout(db: Db, userId: string, id: string): Promise<boolean> {
  return db.tx(async (tx) => {
    const rows = await tx.query<{ mode: DashboardMode; is_default: boolean }>(
      "delete from public.layouts where id = $1 and user_id = $2 returning mode, is_default",
      [id, userId],
    );
    const deleted = rows[0];
    if (!deleted) return false;
    if (deleted.is_default) {
      await tx.query(
        `update public.layouts set is_default = true where id = (
           select id from public.layouts where user_id = $1 and mode = $2 order by created_at asc limit 1)`,
        [userId, deleted.mode],
      );
    }
    return true;
  });
}

export async function setDefaultLayout(db: Db, userId: string, id: string): Promise<boolean> {
  return db.tx(async (tx) => {
    const rows = await tx.query<{ mode: DashboardMode }>(
      "select mode from public.layouts where id = $1 and user_id = $2",
      [id, userId],
    );
    if (!rows[0]) return false;
    await tx.query("update public.layouts set is_default = false where user_id = $1 and mode = $2", [
      userId,
      rows[0].mode,
    ]);
    await tx.query("update public.layouts set is_default = true where id = $1 and user_id = $2", [id, userId]);
    return true;
  });
}
