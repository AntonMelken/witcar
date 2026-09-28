"use client";

import { useT } from "@/i18n/lite";
import { BigNumber } from "@/components/dashboard/BigNumber";
import { Tile } from "@/components/dashboard/Tile";
import { formatTime } from "@/lib/client/format";
import { useNow } from "@/lib/client/tick";
import type { WidgetProps } from "../types";
import type { ClockConfig } from "./definition";

export default function ClockWidget({ config, mode }: WidgetProps<ClockConfig>) {
  const t = useT("widgets.clock");
  // drive mode: 24 h, never seconds (§14.6)
  const seconds = mode !== "drive" && config.showSeconds;
  const now = useNow(seconds ? 1000 : 60_000);
  const text = now == null ? "--:--" : formatTime(new Date(now), { seconds, timeZone: config.timeZone });
  const label =
    config.label || (config.timeZone !== "local" ? config.timeZone.split("/").pop()?.replace("_", " ") : undefined);
  return (
    <Tile label={label}>
      <BigNumber mode={mode} scale={seconds ? 0.72 : 1}>
        <span suppressHydrationWarning aria-label={t("title")}>
          {text}
        </span>
      </BigNumber>
    </Tile>
  );
}
