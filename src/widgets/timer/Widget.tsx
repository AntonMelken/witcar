"use client";

import { useT } from "@/i18n/lite";
import { useEffect, useState } from "react";
import { BigNumber } from "@/components/dashboard/BigNumber";
import { Icon } from "@/components/dashboard/icons";
import { Tile } from "@/components/dashboard/Tile";
import { formatDuration } from "@/lib/client/format";
import { readJson, writeJson } from "@/lib/client/storage";
import { useNow } from "@/lib/client/tick";
import type { WidgetProps } from "../types";
import type { TimerConfig } from "./definition";

type TimerState =
  { status: "idle" } | { status: "running"; endsAt: number } | { status: "paused"; remainingMs: number };

export function remainingMs(state: TimerState, durationMs: number, now: number): number {
  if (state.status === "running") return Math.max(0, state.endsAt - now);
  if (state.status === "paused") return state.remainingMs;
  return durationMs;
}

export default function TimerWidget({ instanceId, config, mode }: WidgetProps<TimerConfig>) {
  const t = useT("widgets.timer");
  const storageKey = `wc:timer:${instanceId}`;
  const [state, setState] = useState<TimerState>({ status: "idle" });
  const durationMs = config.durationMin * 60_000;
  // Drive mode: minute granularity -> max. one visible change per minute (§14.5)
  const now = useNow(mode === "drive" ? 60_000 : 1000);

  useEffect(() => {
    const saved = readJson<TimerState>(storageKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted timer after mount
    if (saved) setState(saved);
  }, [storageKey]);

  const update = (next: TimerState) => {
    setState(next);
    writeJson(storageKey, next);
  };

  const left = now == null ? durationMs : remainingMs(state, durationMs, now);
  const done = state.status === "running" && left === 0;
  const text = done ? t("done") : formatDuration(left, mode !== "drive");

  return (
    <Tile label={config.label || t("title")}>
      <BigNumber mode={mode} className={done ? "text-accent" : ""}>
        <span suppressHydrationWarning>{text}</span>
      </BigNumber>
      {mode === "standard" ? (
        <div className="flex gap-2 mt-[4cqh]">
          {state.status === "running" && !done ? (
            <button
              type="button"
              className="btn"
              onClick={() => update({ status: "paused", remainingMs: left })}
              aria-label={t("pause")}
            >
              <Icon name="pause" />
            </button>
          ) : !done ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                update({
                  status: "running",
                  endsAt: Date.now() + (state.status === "paused" ? state.remainingMs : durationMs),
                })
              }
              aria-label={t("start")}
            >
              <Icon name="play" />
            </button>
          ) : null}
          <button type="button" className="btn" onClick={() => update({ status: "idle" })} aria-label={t("reset")}>
            <Icon name="reset" />
          </button>
        </div>
      ) : null}
    </Tile>
  );
}
