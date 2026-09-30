import { z } from "zod";
import { CLOCK_MAX_ZONES } from "./definition";
import { isValidTimeZone } from "./tz";

const zoneId = z.string().max(64).refine(isValidTimeZone, "unknown time zone");

export const clockSchema = z.object({
  showSeconds: z.boolean().default(false),
  /** 12 h display with AM/PM (never in drive mode) */
  hour12: z.boolean().default(false),
  /** main clock: "local" = this device, or an IANA zone such as "Asia/Tokyo" */
  timeZone: z.union([z.literal("local"), zoneId]).default("local"),
  label: z.string().trim().max(24).default(""),
  /** more places shown below/next to the main clock */
  zones: z
    .array(z.object({ timeZone: zoneId, label: z.string().trim().max(24).default("") }))
    .max(CLOCK_MAX_ZONES)
    .default([]),
});
export type ClockConfig = z.infer<typeof clockSchema>;
