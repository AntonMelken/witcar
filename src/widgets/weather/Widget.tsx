"use client";

import { Icon } from "@/components/dashboard/icons";
import { useT } from "@/i18n/lite";
import { BigNumber } from "@/components/dashboard/BigNumber";
import { StaleBadge } from "@/components/dashboard/StaleBadge";
import { Tile } from "@/components/dashboard/Tile";
import { SourceCredit } from "@/widgets/shared/SourceCredit";
import { formatNumber } from "@/lib/client/format";
import { dataKey, type DataEntry, type WidgetProps } from "../types";
import {
  weatherMeta,
  weatherPlaces,
  type ForecastDay,
  type WeatherConfig,
  type WeatherData,
  type WeatherLocation,
} from "./definition";
import { weatherCondition, weekdayLabel } from "./forecast";

export { weatherCondition } from "./forecast";

const keyOf = (p: WeatherLocation) => dataKey({ kind: "weather", params: { lat: p.lat, lon: p.lon } });

export function WeatherCredit({ source, mode }: { source: string; mode: "standard" | "drive" }) {
  const t = useT("widgets.weather");
  if (source === "met-norway") {
    return (
      <SourceCredit
        label="Wetterdaten: MET Norway"
        href="https://www.met.no/en/free-meteorological-data/Licensing-and-crediting"
        mode={mode}
      />
    );
  }
  if (source === "open-meteo") {
    return <SourceCredit label="Wetterdaten: Open-Meteo.com" href="https://open-meteo.com/" mode={mode} />;
  }
  return <span className="truncate">{source === "mock" ? t("demoData") : ""}</span>;
}

/** Seven days as a strip: weekday, icon, high/low. */
function WeekStrip({ days }: { days: ForecastDay[] }) {
  const t = useT("widgets.weather");
  return (
    <ul className="mt-[3cqh] grid grid-cols-7 gap-[1cqw] tabular" data-testid="week-strip">
      {days.slice(0, 7).map((d, k) => {
        const cond = weatherCondition(d.code, true);
        return (
          <li key={d.date} className="flex min-w-0 flex-col items-center gap-[0.5cqh] text-center">
            <span className="text-dim" style={{ fontSize: "max(11px, min(6cqh, 3cqw))" }}>
              {k === 0 ? t("today") : weekdayLabel(d.date, "short")}
            </span>
            <span title={t(`codes.${cond.key}`)}>
              <Icon name={cond.icon} size="min(9cqh, 6cqw)" />
            </span>
            <span className="font-semibold" style={{ fontSize: "max(12px, min(6.5cqh, 3.4cqw))" }}>
              {d.highC != null ? `${Math.round(d.highC)}°` : "—"}
            </span>
            <span className="text-dim" style={{ fontSize: "max(11px, min(5.5cqh, 3cqw))" }}>
              {d.lowC != null ? `${Math.round(d.lowC)}°` : "—"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function WeatherWidget({ config, mode, data, size }: WidgetProps<WeatherConfig>) {
  const t = useT("widgets.weather");
  const places = weatherPlaces(config, mode);
  if (places.length === 0) {
    return (
      <Tile label={t("title")}>
        <p className="text-dim">{t("noLocation")}</p>
      </Tile>
    );
  }
  const entries: { place: WeatherLocation; entry: DataEntry | undefined }[] = places.map((place) => ({
    place,
    entry: data[keyOf(place)],
  }));
  const first = entries[0]!.entry;
  const newest = entries.map((e) => e.entry?.result).find(Boolean);
  const footer = newest ? (
    <span className="flex items-center justify-between gap-2">
      <WeatherCredit source={newest.source} mode={mode} />
      <StaleBadge
        fetchedAt={newest.fetchedAt}
        refreshMs={weatherMeta.staleAfterMs!}
        serverStale={newest.stale}
        error={first?.error}
      />
    </span>
  ) : null;

  if (places.length > 1) {
    const rowSize = `max(12px, min(${Math.floor(56 / Math.max(places.length, 2))}cqh, 6cqw))`;
    return (
      <Tile label={t("title")} footer={footer}>
        <ul className="flex min-h-0 flex-col justify-center gap-[2cqh] overflow-hidden" data-testid="weather-places">
          {entries.map(({ place, entry }) => {
            const w = entry?.result?.data as WeatherData | undefined;
            const cond = w ? weatherCondition(w.code, w.isDay) : null;
            return (
              <li
                key={`${place.lat},${place.lon}`}
                className="flex items-center gap-3 tabular"
                style={{ fontSize: rowSize }}
              >
                {cond ? <Icon name={cond.icon} size="1.3em" /> : <span style={{ width: "1.3em" }} />}
                <span className="min-w-0 flex-1 truncate font-semibold">{place.name}</span>
                {w ? (
                  <span className="whitespace-nowrap">
                    <span className="font-semibold">{formatNumber(Math.round(w.tempC))}°</span>
                    {w.highC != null && w.lowC != null ? (
                      <span className="ml-2 text-dim" style={{ fontSize: "0.75em" }}>
                        {Math.round(w.highC)}° / {Math.round(w.lowC)}°
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-dim">{entry?.error ? "—" : "…"}</span>
                )}
              </li>
            );
          })}
        </ul>
      </Tile>
    );
  }

  const place = places[0]!;
  const w = first?.result?.data as WeatherData | undefined;
  const cond = w ? weatherCondition(w.code, w.isDay) : null;
  const week = mode === "standard" && config.showWeek && size.h >= 4 && (w?.days?.length ?? 0) >= 2;
  return (
    <Tile label={place.name} footer={footer}>
      {w && cond ? (
        <>
          <div className="flex items-center gap-[4cqw]">
            <Icon name={cond.icon} size={week ? "min(26cqh, 16cqw)" : "min(40cqh, 22cqw)"} />
            <div className="min-w-0">
              <BigNumber mode={mode} scale={week ? 0.75 : 1}>
                {formatNumber(Math.round(w.tempC))}°
              </BigNumber>
              {mode === "standard" ? (
                <div className="mt-[2cqh] truncate text-dim" style={{ fontSize: "max(12px, min(9cqh, 5cqw))" }}>
                  {t(`codes.${cond.key}`)}
                  {w.highC != null && w.lowC != null ? ` · ${Math.round(w.highC)}° / ${Math.round(w.lowC)}°` : ""}
                </div>
              ) : null}
            </div>
          </div>
          {week ? <WeekStrip days={w.days!} /> : null}
        </>
      ) : (
        <p className="text-dim" data-loading>
          {first?.error ? t("unavailable") : t("loading")}
        </p>
      )}
    </Tile>
  );
}
