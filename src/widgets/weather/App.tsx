"use client";

import { MapPin, Plus, Search, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { GeoCredit } from "@/components/apps/GeoCredit";
import { Section, Toggle } from "@/components/apps/ui";
import { Icon } from "@/components/dashboard/icons";
import { useT } from "@/i18n/lite";
import { formatNumber } from "@/lib/client/format";
import { dataKey, type AppProps } from "../types";
import { WeatherCredit } from "./Widget";
import {
  WEATHER_MAX_EXTRA,
  weatherPlaces,
  type ForecastDay,
  type WeatherConfig,
  type WeatherData,
  type WeatherLocation,
} from "./definition";
import { dayMonthLabel, rangePosition, weatherCondition, weekdayLabel } from "./forecast";

interface GeoResult {
  name: string;
  lat: number;
  lon: number;
  country: string | null;
  admin1: string | null;
}

const same = (a: WeatherLocation, b: WeatherLocation) => a.lat === b.lat && a.lon === b.lon;
const keyOf = (p: WeatherLocation) => dataKey({ kind: "weather", params: { lat: p.lat, lon: p.lon } });

export default function WeatherApp({ config, data, setConfig }: AppProps<WeatherConfig>) {
  const t = useT("widgets.weather");
  const places = weatherPlaces(config);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [adding, setAdding] = useState(places.length === 0);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [results, setResults] = useState<GeoResult[] | null>(null);
  const [source, setSource] = useState<string | null>(null);

  const selected = places.find((p) => keyOf(p) === selectedKey) ?? places[0] ?? null;
  const entry = selected ? data[keyOf(selected)] : undefined;
  const w = entry?.result?.data as WeatherData | undefined;
  const cond = w ? weatherCondition(w.code, w.isDay) : null;
  const isMain = !!selected && !!config.location && same(selected, config.location);
  const full = (config.extra?.length ?? 0) >= WEATHER_MAX_EXTRA;

  const search = async () => {
    if (q.trim().length < 2) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/geo/search?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { results: GeoResult[]; source?: string };
      setResults(body.results);
      setSource(body.source ?? null);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const add = (r: GeoResult) => {
    const place: WeatherLocation = { name: r.name, lat: r.lat, lon: r.lon };
    if (places.some((p) => same(p, place))) {
      setSelectedKey(keyOf(place));
    } else if (!config.location) {
      setConfig({ ...config, location: place });
    } else if (!full) {
      setConfig({ ...config, extra: [...config.extra, place] });
    } else return;
    setSelectedKey(keyOf(place));
    setAdding(false);
    setResults(null);
    setQ("");
  };

  const makeMain = (place: WeatherLocation) => {
    if (!config.location) return;
    const extra = [config.location, ...config.extra.filter((p) => !same(p, place))].slice(0, WEATHER_MAX_EXTRA);
    setConfig({ ...config, location: place, extra });
  };

  const remove = (place: WeatherLocation) => {
    if (config.location && same(place, config.location)) {
      // the first extra place becomes the main place
      const [next, ...rest] = config.extra;
      setConfig({ ...config, location: next ?? null, extra: rest });
    } else {
      setConfig({ ...config, extra: config.extra.filter((p) => !same(p, place)) });
    }
    setSelectedKey(null);
  };

  const days = w?.days ?? [];
  const lows = days.map((d) => d.lowC).filter((v): v is number => v != null);
  const highs = days.map((d) => d.highC).filter((v): v is number => v != null);
  const weekMin = lows.length ? Math.min(...lows) : 0;
  const weekMax = highs.length ? Math.max(...highs) : 0;

  return (
    <div className="space-y-4">
      <Section
        title={t("app.places")}
        hint={t("app.placesHint", { max: WEATHER_MAX_EXTRA + 1 })}
        actions={
          <button
            type="button"
            className="btn"
            onClick={() => setAdding((v) => !v)}
            aria-expanded={adding}
            disabled={places.length > 0 && full && !adding}
          >
            <Plus size={18} aria-hidden="true" />
            {t("app.addPlace")}
          </button>
        }
      >
        <ul className="flex flex-wrap gap-2" data-testid="weather-chips">
          {places.map((p) => {
            const pw = data[keyOf(p)]?.result?.data as WeatherData | undefined;
            const active = !!selected && same(p, selected);
            return (
              <li key={keyOf(p)}>
                <button
                  type="button"
                  className={`btn ${active ? "btn-primary" : ""}`}
                  aria-pressed={active}
                  onClick={() => setSelectedKey(keyOf(p))}
                >
                  {config.location && same(p, config.location) ? <Star size={16} aria-hidden="true" /> : null}
                  <span className="max-w-40 truncate">{p.name}</span>
                  {pw ? <span className="tabular">{formatNumber(Math.round(pw.tempC))}°</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
        {adding ? (
          <div className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex gap-2">
              <input
                className="input"
                type="search"
                value={q}
                autoFocus
                placeholder={t("app.searchPlaceholder")}
                aria-label={t("app.searchPlaceholder")}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void search();
                  }
                }}
              />
              <button
                type="button"
                className="btn"
                onClick={() => void search()}
                disabled={busy}
                aria-label={t("app.search")}
              >
                <Search size={18} aria-hidden="true" />
              </button>
            </div>
            {error ? <p className="text-sm text-negative">{t("app.searchError")}</p> : null}
            {results && results.length === 0 ? <p className="text-sm text-dim">{t("app.noResults")}</p> : null}
            {results && results.length > 0 ? (
              <ul className="space-y-1">
                {results.map((r) => (
                  <li key={`${r.lat},${r.lon}`}>
                    <button
                      type="button"
                      className="btn btn-ghost w-full justify-start text-left font-normal"
                      onClick={() => add(r)}
                    >
                      <MapPin size={16} aria-hidden="true" />
                      <span className="min-w-0 truncate">{r.name}</span>
                      <span className="truncate text-sm text-dim">
                        {[r.admin1, r.country].filter(Boolean).join(", ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {results ? <GeoCredit source={source} /> : null}
          </div>
        ) : null}
      </Section>

      {selected ? (
        <Section
          title={selected.name}
          actions={
            <>
              {!isMain ? (
                <button type="button" className="btn" onClick={() => makeMain(selected)}>
                  <Star size={18} aria-hidden="true" />
                  {t("app.makeMain")}
                </button>
              ) : (
                <span className="text-sm text-dim">{t("app.isMain")}</span>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => remove(selected)}
                aria-label={t("app.remove", { name: selected.name })}
                disabled={places.length <= 1}
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </>
          }
        >
          {w && cond ? (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <div className="flex items-center gap-4">
                <Icon name={cond.icon} size={72} />
                <div>
                  <p className="tabular text-6xl font-semibold leading-none" data-testid="app-weather-temp">
                    {formatNumber(Math.round(w.tempC))}°
                  </p>
                  <p className="mt-1 text-dim">{t(`codes.${cond.key}`)}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {w.highC != null ? (
                  <>
                    <dt className="text-dim">{t("app.high")}</dt>
                    <dd className="tabular">{Math.round(w.highC)}°</dd>
                  </>
                ) : null}
                {w.lowC != null ? (
                  <>
                    <dt className="text-dim">{t("app.low")}</dt>
                    <dd className="tabular">{Math.round(w.lowC)}°</dd>
                  </>
                ) : null}
                {w.windKmh != null ? (
                  <>
                    <dt className="text-dim">{t("app.wind")}</dt>
                    <dd className="tabular">{Math.round(w.windKmh)} km/h</dd>
                  </>
                ) : null}
                {w.precipProb != null ? (
                  <>
                    <dt className="text-dim">{t("app.rain")}</dt>
                    <dd className="tabular">{Math.round(w.precipProb)} %</dd>
                  </>
                ) : null}
              </dl>
            </div>
          ) : (
            <p className="text-dim">{entry?.error ? t("unavailable") : t("loading")}</p>
          )}
          {entry?.result ? (
            <div className="text-xs text-dim">
              <WeatherCredit source={entry.result.source} mode="standard" />
            </div>
          ) : null}
        </Section>
      ) : null}

      {selected && w ? (
        <Section title={t("app.week")}>
          {days.length === 0 ? (
            <p className="text-dim">{t("app.noForecast")}</p>
          ) : (
            <ol className="divide-y divide-border" data-testid="week-list">
              {days.slice(0, 7).map((d, k) => (
                <DayRow key={d.date} day={d} today={k === 0} min={weekMin} max={weekMax} />
              ))}
            </ol>
          )}
          <Toggle
            checked={config.showWeek}
            onChange={(v) => setConfig({ ...config, showWeek: v })}
            label={t("app.showWeek")}
          />
        </Section>
      ) : null}
    </div>
  );
}

function DayRow({ day, today, min, max }: { day: ForecastDay; today: boolean; min: number; max: number }) {
  const t = useT("widgets.weather");
  const cond = weatherCondition(day.code, true);
  const lowPos = day.lowC != null ? rangePosition(day.lowC, min, max) : 0;
  const highPos = day.highC != null ? rangePosition(day.highC, min, max) : 1;
  return (
    <li className="flex items-center gap-3 py-2" data-day={day.date}>
      <div className="w-28 shrink-0 sm:w-36">
        <p className="font-semibold">{today ? t("today") : weekdayLabel(day.date, "long")}</p>
        <p className="text-sm tabular text-dim">{dayMonthLabel(day.date)}</p>
      </div>
      <span title={t(`codes.${cond.key}`)} className="shrink-0">
        <Icon name={cond.icon} size={32} />
      </span>
      <span className="hidden min-w-0 flex-1 truncate text-sm text-dim sm:block">{t(`codes.${cond.key}`)}</span>
      <span className="tabular w-10 shrink-0 text-right text-dim">
        {day.lowC != null ? `${Math.round(day.lowC)}°` : "—"}
      </span>
      <span className="relative hidden h-2 w-24 shrink-0 rounded-full bg-surface-2 sm:block" aria-hidden="true">
        <span
          className="absolute top-0 h-2 rounded-full bg-accent"
          style={{
            left: `${lowPos * 100}%`,
            width: `${Math.max(8, (highPos - lowPos) * 100)}%`,
            maxWidth: `${100 - lowPos * 100}%`,
          }}
        />
      </span>
      <span className="tabular w-10 shrink-0 font-semibold">
        {day.highC != null ? `${Math.round(day.highC)}°` : "—"}
      </span>
      <span className="tabular hidden w-16 shrink-0 text-right text-sm text-dim md:block">
        {day.precipMm != null ? `${formatNumber(day.precipMm, "de-DE", { max: 1 })} mm` : ""}
      </span>
    </li>
  );
}
