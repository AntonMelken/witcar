import { z } from "zod";

export const timerSchema = z.object({
  durationMin: z.number().int().min(1).max(600).default(10),
  label: z.string().trim().max(24).default(""),
});
export type TimerConfig = z.infer<typeof timerSchema>;
