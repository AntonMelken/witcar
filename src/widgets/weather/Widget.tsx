"use client";

import { Icon, type IconName } from "@/components/dashboard/icons";
import { useT } from "@/i18n/lite";
import { BigNumber } from "@/components/dashboard/BigNumber";
import { StaleBadge } from "@/components/dashboard/StaleBadge";
import { Tile } from "@/components/dashboard/Tile";
import { formatNumber } from "@/lib/client/format";
import { dataKey, type WidgetProps } from "../types";
import { weatherMeta, type WeatherConfig, type WeatherData } from "./definition";

/** WMO weather code -> condition key + icon */
export function weatherCondition(code: number, isDay: boolean): { key: string; icon: IconName } {
  if (code === 0) return { key: "clear", icon: isDay ? "sun" : "moon" };
  if (code <= 2) return { key: "partly", icon: isDay ? "cloudSun" : "cloud" };
  if (code === 3) return { key: "cloudy", icon: "cloud" };
  if (code === 45 || code === 48) return { key: "fog", icon: "fog" };
  if (code >= 51 && code <= 57) return { key: "drizzle", icon: "drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { key: "rain", icon: "rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { key: "snow", icon: "snow" };
  if (code >= 95) return { key: "storm", icon: "storm" };
  return { key: "cloudy", icon: "cloud" };
}

export default function WeatherWidget({ config, mode, data }: WidgetProps<WeatherConfig>) {
  const t = useT("widgets.weather");
  if (!config.location) {
    return (
      <Tile label={t("title")}>
        <p className="text-dim">{t("noLocation")}</p>
      </Tile>
    );
  }
  const entry = data[dataKey({ kind: "weather", params: { lat: config.location.lat, lon: config.location.lon } })];
  const w = entry?.result?.data as WeatherData | undefined;
  const cond = w ? weatherCondition(w.code, w.isDay) : null;
  const footer = entry?.result ? (
    <StaleBadge
      fetchedAt={entry.result.fetchedAt}
      refreshMs={weatherMeta.refreshMs!}
      serverStale={entry.result.stale}
      error={entry.error}
    />
  ) : null;

  return (
    <Tile label={config.location.name} footer={footer}>
      {w && cond ? (
        <div className="flex items-center gap-[4cqw]">
          <Icon name={cond.icon} size="min(40cqh, 22cqw)" />
          <div className="min-w-0">
            <BigNumber mode={mode}>{formatNumber(Math.round(w.tempC))}°</BigNumber>
            {mode === "standard" ? (
              <div className="text-dim mt-[2cqh] truncate" style={{ fontSize: "max(12px, min(9cqh, 5cqw))" }}>
                {t(`codes.${cond.key}`)}
                {w.highC != null && w.lowC != null ? ` · ${Math.round(w.highC)}° / ${Math.round(w.lowC)}°` : ""}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-dim" data-loading>
          {entry?.error ? t("unavailable") : t("loading")}
        </p>
      )}
    </Tile>
  );
}
