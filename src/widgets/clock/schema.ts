import { z } from "zod";
import { TIME_ZONES } from "./definition";

export const clockSchema = z.object({
  showSeconds: z.boolean().default(false),
  timeZone: z.enum(TIME_ZONES).default("local"),
  label: z.string().trim().max(24).default(""),
});
export type ClockConfig = z.infer<typeof clockSchema>;
