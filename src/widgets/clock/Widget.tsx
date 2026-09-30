"use client";

import { useT } from "@/i18n/lite";
import { BigNumber } from "@/components/dashboard/BigNumber";
import { Tile } from "@/components/dashboard/Tile";
import { formatTime } from "@/lib/client/format";
import { useNow } from "@/lib/client/tick";
import type { WidgetProps } from "../types";
import type { ClockConfig } from "./definition";
import { dayDelta, zoneCity } from "./tz";

export default function ClockWidget({ config, mode, size }: WidgetProps<ClockConfig>) {
  const t = useT("widgets.clock");
  // drive mode: 24 h, never seconds (§14.6), one clock only
  const drive = mode === "drive";
  const seconds = !drive && config.showSeconds;
  const hour12 = !drive && config.hour12;
  const now = useNow(seconds ? 1000 : 60_000);
  const date = now == null ? null : new Date(now);
  const time = (tz: string, withSeconds = seconds) =>
    date ? formatTime(date, { seconds: withSeconds, timeZone: tz, hour12 }) : "--:--";
  const label = config.label || (config.timeZone !== "local" ? zoneCity(config.timeZone) : undefined);
  const extra = drive ? [] : config.zones;

  const main = (scale: number) => (
    <BigNumber mode={mode} scale={seconds ? scale * 0.72 : scale}>
      <span suppressHydrationWarning aria-label={t("title")}>
        {time(config.timeZone)}
      </span>
    </BigNumber>
  );

  if (extra.length === 0) return <Tile label={label}>{main(1)}</Tile>;

  const dayMark = (tz: string) => {
    if (!date) return "";
    const d = dayDelta(date, tz);
    return d === 0 ? "" : d > 0 ? t("tomorrow") : t("yesterday");
  };
  const zoneName = (z: { timeZone: string; label: string }) => z.label || zoneCity(z.timeZone);

  // wide and flat tiles put the other places next to the main clock, all others below it
  const wide = size.w >= 6 && size.h <= 3;
  if (wide) {
    return (
      <Tile label={label}>
        <div className="flex min-h-0 items-center gap-[4cqw]">
          <div className="shrink-0">{main(0.8)}</div>
          <ul
            className="grid min-w-0 flex-1 gap-x-[3cqw] gap-y-[2cqh]"
            style={{ gridTemplateColumns: `repeat(${Math.min(extra.length, 3)}, minmax(0, 1fr))` }}
          >
            {extra.map((z) => (
              <li key={`${z.timeZone}|${z.label}`} className="min-w-0 tabular">
                <div className="truncate text-dim" style={{ fontSize: "max(11px, min(9cqh, 2.4cqw))" }}>
                  {zoneName(z)}
                </div>
                <div className="font-semibold" style={{ fontSize: "max(14px, min(16cqh, 4cqw))" }}>
                  <span suppressHydrationWarning>{time(z.timeZone, false)}</span>
                  <span className="ml-1 text-dim" style={{ fontSize: "0.6em" }}>
                    {dayMark(z.timeZone)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Tile>
    );
  }
  const rowSize = `max(12px, min(${Math.floor(46 / Math.max(extra.length + 1, 3))}cqh, 6cqw))`;
  return (
    <Tile label={label}>
      <div className="flex min-h-0 flex-col justify-center gap-[2cqh]">
        {main(0.62)}
        <ul className="flex min-h-0 flex-col gap-[1cqh] overflow-hidden">
          {extra.map((z) => (
            <li
              key={`${z.timeZone}|${z.label}`}
              className="flex items-baseline justify-between gap-3 tabular"
              style={{ fontSize: rowSize }}
            >
              <span className="truncate text-dim">{zoneName(z)}</span>
              <span className="whitespace-nowrap font-semibold">
                <span suppressHydrationWarning>{time(z.timeZone, false)}</span>
                <span className="ml-1 text-dim" style={{ fontSize: "0.7em" }}>
                  {dayMark(z.timeZone)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Tile>
  );
}
