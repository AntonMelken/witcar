import type { WidgetBaseMeta } from "../types";
import type { TimerConfig } from "./schema";

export type { TimerConfig } from "./schema";

export const timerMeta: WidgetBaseMeta<TimerConfig> = {
  type: "timer",
  title: "timer.title",
  minSize: { w: 2, h: 2 },
  defaultSize: { w: 4, h: 3 },
  defaultConfig: { durationMin: 10, label: "" },
  // display only in drive mode, no start/stop there
  driveSafe: true,
  refreshMs: null,
  proOnly: false,
  fields: [
    { key: "durationMin", kind: "number", label: "timer.fields.durationMin", min: 1, max: 600 },
    { key: "label", kind: "text", label: "timer.fields.label", maxLength: 24 },
  ],
};
