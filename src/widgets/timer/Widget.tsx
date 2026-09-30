"use client";

import { useT } from "@/i18n/lite";
import { BigNumber } from "@/components/dashboard/BigNumber";
import { Icon } from "@/components/dashboard/icons";
import { Tile } from "@/components/dashboard/Tile";
import { formatDuration } from "@/lib/client/format";
import { useNow } from "@/lib/client/tick";
import type { WidgetProps } from "../types";
import type { TimerConfig } from "./definition";
import { isDone, pause, remainingMs, IDLE, start } from "./logic";
import { useTimer } from "./store";

export { remainingMs } from "./logic";

export default function TimerWidget({ instanceId, config, mode }: WidgetProps<TimerConfig>) {
  const t = useT("widgets.timer");
  const [state, setState] = useTimer(instanceId);
  const durationMs = config.durationSec * 1000;
  // Drive mode: minute granularity -> max. one visible change per minute (§14.5)
  const now = useNow(mode === "drive" ? 60_000 : 1000);

  const left = now == null ? durationMs : remainingMs(state, durationMs, now);
  const done = now != null && isDone(state, now);
  const text = done ? t("done") : formatDuration(left, mode !== "drive");

  return (
    <Tile label={config.label || t("title")}>
      <BigNumber mode={mode} className={done ? "text-accent" : ""}>
        <span suppressHydrationWarning>{text}</span>
      </BigNumber>
      {mode === "standard" ? (
        <div className="wc-interactive mt-[4cqh] flex gap-2 self-start">
          {state.status === "running" && !done ? (
            <button
              type="button"
              className="btn"
              onClick={() => setState(pause(state, Date.now()))}
              aria-label={t("pause")}
            >
              <Icon name="pause" />
            </button>
          ) : !done ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setState(start(state, durationMs, Date.now()))}
              aria-label={t("start")}
            >
              <Icon name="play" />
            </button>
          ) : null}
          <button type="button" className="btn" onClick={() => setState(IDLE)} aria-label={t("reset")}>
            <Icon name="reset" />
          </button>
        </div>
      ) : null}
    </Tile>
  );
}
