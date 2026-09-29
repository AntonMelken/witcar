import { randomToken, sha256 } from "@/lib/auth/tokens";
import type { Db } from "@/lib/db/types";
import { findFreeSpot } from "@/lib/layout/grid";
import { STARTER_TYPES } from "@/lib/layout/fixtures";
import { newWidgetId, type LayoutWidget } from "@/lib/layout/schema";
import { DEFAULT_PRESET_ID } from "@/lib/presets";
import { createDevice } from "@/lib/repo/devices";
import { ensureProfile, updateProfile } from "@/lib/repo/profiles";
import { createCarUser } from "@/lib/repo/users";
import { getWidgetMeta } from "@/widgets/registry";
import { createLayoutForUser } from "./layouts";

/** Same starter set as the onboarding default (clock, weather, stocks). */
export function starterWidgets(): LayoutWidget[] {
  const widgets: LayoutWidget[] = [];
  for (const type of STARTER_TYPES) {
    const meta = getWidgetMeta(type)!;
    const spot = findFreeSpot(widgets, meta.defaultSize.w, meta.defaultSize.h);
    if (!spot) continue;
    const config = { ...(meta.defaultConfig as Record<string, unknown>) };
    widgets.push({ widgetId: newWidgetId(type), type, ...spot, ...meta.defaultSize, config });
  }
  return widgets;
}

/**
 * One tap in the car: account without e-mail, ready-made dashboard and a
 * long-lived device token. Linking a phone/e-mail stays optional.
 */
export async function startCarWithoutAccount(db: Db, preset: string | null, layoutName: string) {
  const userId = await createCarUser(db);
  await ensureProfile(db, userId);
  const vehiclePreset = preset ?? DEFAULT_PRESET_ID;
  await updateProfile(db, userId, { vehiclePreset, onboarded: true });
  const layout = await createLayoutForUser(db, userId, {
    name: layoutName,
    preset: vehiclePreset,
    mode: "standard",
    widgets: starterWidgets(),
    makeDefault: true,
  });
  if (!layout.ok) throw new Error(`starter layout rejected: ${layout.code}`);
  const deviceToken = randomToken(32);
  const device = await createDevice(db, { userId, label: null, preset: vehiclePreset, tokenHash: sha256(deviceToken) });
  return { userId, deviceId: device.id, deviceToken };
}
