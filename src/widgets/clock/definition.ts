import type { WidgetBaseMeta } from "../types";
import type { ClockConfig } from "./schema";

export type { ClockConfig } from "./schema";

/** Places besides the main clock. */
export const CLOCK_MAX_ZONES = 6;

/** Zones offered in the editor's select; the clock app offers all of them plus a city search. */
export const TIME_ZONES = [
  "local",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Istanbul",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

export const clockMeta: WidgetBaseMeta<ClockConfig> = {
  type: "clock",
  title: "clock.title",
  minSize: { w: 2, h: 2 },
  defaultSize: { w: 4, h: 4 },
  defaultConfig: { showSeconds: false, hour12: false, timeZone: "local", label: "", zones: [] },
  driveSafe: true,
  refreshMs: null,
  proOnly: false,
  fields: [
    { key: "showSeconds", kind: "boolean", label: "clock.fields.showSeconds" },
    { key: "hour12", kind: "boolean", label: "clock.fields.hour12" },
    {
      key: "timeZone",
      kind: "select",
      label: "clock.fields.timeZone",
      options: TIME_ZONES.map((tz) => ({ value: tz, label: tz === "local" ? "clock.localTime" : tz })),
    },
    { key: "label", kind: "text", label: "clock.fields.label", maxLength: 24 },
    { key: "zones", kind: "hint", label: "clock.fields.zonesHint" },
  ],
};
