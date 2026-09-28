import type { WidgetBaseMeta } from "../types";
import type { ClockConfig } from "./schema";

export type { ClockConfig } from "./schema";

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
  defaultConfig: { showSeconds: false, timeZone: "local", label: "" },
  driveSafe: true,
  refreshMs: null,
  proOnly: false,
  fields: [
    { key: "showSeconds", kind: "boolean", label: "clock.fields.showSeconds" },
    {
      key: "timeZone",
      kind: "select",
      label: "clock.fields.timeZone",
      options: TIME_ZONES.map((tz) => ({ value: tz, label: tz === "local" ? "clock.localTime" : tz })),
    },
    { key: "label", kind: "text", label: "clock.fields.label", maxLength: 24 },
  ],
};
