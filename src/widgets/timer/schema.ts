import { z } from "zod";
import { TIMER_MAX_SEC } from "./definition";

const base = z.object({
  durationSec: z.number().int().min(1).max(TIMER_MAX_SEC).default(600),
  label: z.string().trim().max(24).default(""),
});

/** Configs saved before the timer took seconds have `durationMin`: converted on read. */
export const timerSchema = z.preprocess((raw) => {
  if (raw && typeof raw === "object" && !("durationSec" in raw)) {
    const { durationMin, ...rest } = raw as Record<string, unknown>;
    if (typeof durationMin === "number" && Number.isFinite(durationMin)) {
      return { ...rest, durationSec: Math.round(durationMin * 60) };
    }
  }
  return raw;
}, base);
export type TimerConfig = z.infer<typeof base>;
