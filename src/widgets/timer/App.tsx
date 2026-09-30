"use client";

import { Delete, Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Section } from "@/components/apps/ui";
import { useT } from "@/i18n/lite";
import { formatDuration } from "@/lib/client/format";
import { useNow } from "@/lib/client/tick";
import type { AppProps } from "../types";
import { TIMER_MAX_SEC, type TimerConfig } from "./definition";
import {
  addTime,
  digitsDisplay,
  digitsToSeconds,
  IDLE,
  isDone,
  pause,
  progress,
  remainingMs,
  splitDuration,
  start,
} from "./logic";
import { useTimer } from "./store";

const PRESET_MIN = [1, 2, 3, 5, 10, 15, 20, 30, 45, 60];
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0"] as const;

const clampSec = (s: number) => Math.min(TIMER_MAX_SEC, Math.max(1, Math.round(s)));

export default function TimerApp({ instanceId, config, setConfig }: AppProps<TimerConfig>) {
  const t = useT("widgets.timer.app");
  const tw = useT("widgets.timer");
  const [state, setState] = useTimer(instanceId);
  const now = useNow(1000);
  const [digits, setDigits] = useState("");
  const durationMs = config.durationSec * 1000;
  const left = now == null ? durationMs : remainingMs(state, durationMs, now);
  const done = now != null && isDone(state, now);
  const running = state.status === "running" && !done;
  const typed = digitsToSeconds(digits);
  const typedOk = digits !== "" && typed >= 1 && typed <= TIMER_MAX_SEC;

  // a new duration replaces the running timer: the timer shows and restarts from the new time
  const setDuration = (sec: number) => {
    setConfig({ ...config, durationSec: clampSec(sec) });
    setState(IDLE);
    setDigits("");
  };
  const press = (k: string) => setDigits((d) => (d + k).replace(/^0+/, "").slice(0, 6));
  const { h, m, s } = splitDuration(config.durationSec);
  const pct = now == null ? 0 : progress(state, durationMs, now);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title={config.label || tw("title")}>
        <p
          className={`tabular text-center text-7xl font-semibold leading-tight sm:text-8xl ${done ? "text-accent" : ""}`}
          data-testid="app-timer-display"
          aria-live="off"
        >
          <span suppressHydrationWarning>{done ? tw("done") : formatDuration(left, true)}</span>
        </p>
        <div
          className="h-2 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label={t("progress")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct * 100)}
        >
          <div className="h-full bg-accent" style={{ width: `${pct * 100}%` }} />
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {running ? (
            <button
              type="button"
              className="btn min-w-40"
              onClick={() => setState(pause(state, Date.now()))}
              data-testid="app-timer-pause"
            >
              <Pause size={20} aria-hidden="true" />
              {tw("pause")}
            </button>
          ) : !done ? (
            <button
              type="button"
              className="btn btn-primary min-w-40"
              onClick={() => setState(start(state, durationMs, Date.now()))}
              data-testid="app-timer-start"
            >
              <Play size={20} aria-hidden="true" />
              {tw("start")}
            </button>
          ) : null}
          <button type="button" className="btn min-w-40" onClick={() => setState(IDLE)} data-testid="app-timer-reset">
            <RotateCcw size={20} aria-hidden="true" />
            {tw("reset")}
          </button>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {[60, 300].map((sec) => (
            <button
              key={sec}
              type="button"
              className="btn btn-ghost"
              onClick={() => setState(addTime(state, durationMs, sec * 1000, Date.now()))}
            >
              <Plus size={16} aria-hidden="true" />
              {t("addMinutes", { min: sec / 60 })}
            </button>
          ))}
        </div>
        <label className="block space-y-1">
          <span className="text-sm font-medium">{tw("fields.label")}</span>
          <input
            className="input"
            maxLength={24}
            value={config.label}
            onChange={(e) => setConfig({ ...config, label: e.target.value })}
          />
        </label>
      </Section>

      <Section title={t("setTime")} hint={t("setTimeHint", { time: formatDuration(durationMs, true) })}>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("presets")}>
          {PRESET_MIN.map((min) => (
            <button
              key={min}
              type="button"
              className={`btn ${config.durationSec === min * 60 ? "btn-primary" : ""}`}
              aria-pressed={config.durationSec === min * 60}
              onClick={() => setDuration(min * 60)}
            >
              {min < 60 ? t("minutes", { min }) : t("hour")}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label={t("steps")}>
          {[-60, -10, 10, 60].map((delta) => (
            <button
              key={delta}
              type="button"
              className="btn"
              onClick={() => setDuration(config.durationSec + delta)}
              disabled={clampSec(config.durationSec + delta) === config.durationSec}
            >
              {delta < 0 ? <Minus size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              {Math.abs(delta) >= 60 ? t("stepMinute") : t("stepSeconds", { sec: Math.abs(delta) })}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border p-3">
          <p className="text-center text-sm text-dim">
            {t("own")} ({h} h {m} min {s} s)
          </p>
          <p
            className="tabular my-2 text-center text-4xl font-semibold"
            data-testid="keypad-display"
            aria-live="polite"
          >
            {digitsDisplay(digits)}
          </p>
          <div className="mx-auto grid max-w-xs grid-cols-3 gap-2" role="group" aria-label={t("keypad")}>
            {KEYS.map((k) => (
              <button key={k} type="button" className="btn text-xl" onClick={() => press(k)}>
                {k}
              </button>
            ))}
            <button
              type="button"
              className="btn"
              onClick={() => setDigits((d) => d.slice(0, -1))}
              aria-label={t("backspace")}
              disabled={digits === ""}
            >
              <Delete size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="mx-auto mt-3 flex max-w-xs gap-2">
            <button type="button" className="btn flex-1" onClick={() => setDigits("")} disabled={digits === ""}>
              {t("clear")}
            </button>
            <button
              type="button"
              className="btn btn-primary flex-[2]"
              onClick={() => setDuration(typed)}
              disabled={!typedOk}
              data-testid="keypad-apply"
            >
              {typedOk ? t("apply", { time: formatDuration(typed * 1000, true) }) : t("applyEmpty")}
            </button>
          </div>
          {digits !== "" && typed > TIMER_MAX_SEC ? (
            <p className="mt-2 text-center text-sm text-warning" role="status">
              {t("tooLong")}
            </p>
          ) : null}
        </div>
      </Section>
    </div>
  );
}
