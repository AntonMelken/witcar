import type { WidgetBaseMeta } from "../types";
import type { TimerConfig } from "./schema";

export type { TimerConfig } from "./schema";

/** Longest timer: 24 hours. */
export const TIMER_MAX_SEC = 24 * 3600;

export const timerMeta: WidgetBaseMeta<TimerConfig> = {
  type: "timer",
  title: "timer.title",
  minSize: { w: 2, h: 2 },
  defaultSize: { w: 4, h: 3 },
  defaultConfig: { durationSec: 600, label: "" },
  // display only in drive mode, no start/stop there
  driveSafe: true,
  refreshMs: null,
  proOnly: false,
  fields: [
    { key: "durationSec", kind: "duration", label: "timer.fields.duration", minSec: 1, maxSec: TIMER_MAX_SEC },
    { key: "label", kind: "text", label: "timer.fields.label", maxLength: 24 },
  ],
};
