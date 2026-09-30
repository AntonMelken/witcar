/** Timer state machine and time entry helpers (pure, no React). */

export type TimerState =
  { status: "idle" } | { status: "running"; endsAt: number } | { status: "paused"; remainingMs: number };

export const IDLE: TimerState = { status: "idle" };

export function remainingMs(state: TimerState, durationMs: number, now: number): number {
  if (state.status === "running") return Math.max(0, state.endsAt - now);
  if (state.status === "paused") return state.remainingMs;
  return durationMs;
}

export function isDone(state: TimerState, now: number): boolean {
  return state.status === "running" && state.endsAt <= now;
}

/** Start from idle, or continue a paused timer. */
export function start(state: TimerState, durationMs: number, now: number): TimerState {
  return { status: "running", endsAt: now + (state.status === "paused" ? state.remainingMs : durationMs) };
}

export function pause(state: TimerState, now: number): TimerState {
  return state.status === "running" ? { status: "paused", remainingMs: Math.max(0, state.endsAt - now) } : state;
}

/** Adds (or removes) time; an idle timer starts with the extended duration. */
export function addTime(state: TimerState, durationMs: number, deltaMs: number, now: number): TimerState {
  if (state.status === "running") return { status: "running", endsAt: Math.max(now, state.endsAt + deltaMs) };
  if (state.status === "paused") return { status: "paused", remainingMs: Math.max(1000, state.remainingMs + deltaMs) };
  return { status: "running", endsAt: now + Math.max(1000, durationMs + deltaMs) };
}

/** Elapsed share 0..1 of the current run (for the progress bar). */
export function progress(state: TimerState, durationMs: number, now: number): number {
  if (state.status === "idle" || durationMs <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - remainingMs(state, durationMs, now) / durationMs));
}

/** "H:MM:SS" style input: digits fill from the right (like a microwave); up to 6 digits. */
export function digitsToSeconds(digits: string): number {
  const d = digits.replace(/\D/g, "").slice(-6).padStart(6, "0");
  return Number(d.slice(0, 2)) * 3600 + Number(d.slice(2, 4)) * 60 + Number(d.slice(4, 6));
}

/** The typed digits as HH:MM:SS (what the user sees while typing). */
export function digitsDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(-6).padStart(6, "0");
  return `${d.slice(0, 2)}:${d.slice(2, 4)}:${d.slice(4, 6)}`;
}

export function splitDuration(totalSec: number): { h: number; m: number; s: number } {
  const t = Math.max(0, Math.floor(totalSec));
  return { h: Math.floor(t / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}
