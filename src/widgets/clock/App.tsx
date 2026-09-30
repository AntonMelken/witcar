"use client";

import { LocateFixed, Plus, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Section, Toggle } from "@/components/apps/ui";
import { useT } from "@/i18n/lite";
import { formatTime } from "@/lib/client/format";
import { useNow } from "@/lib/client/tick";
import type { AppProps } from "../types";
import { browserZones, CITY_ZONES, nearestCity, searchZones, type CityZone } from "./cities";
import { CLOCK_MAX_ZONES, type ClockConfig } from "./definition";
import { deviceTimeZone, utcOffsetLabel, zoneCity } from "./tz";

const NAMES = new Map(CITY_ZONES.map((c) => [c.tz, c.city]));
const cityName = (tz: string) => NAMES.get(tz) ?? zoneCity(tz);

export default function ClockApp({ config, setConfig }: AppProps<ClockConfig>) {
  const t = useT("widgets.clock.app");
  const now = useNow(1000);
  const date = now == null ? null : new Date(now);
  const device = useMemo(() => deviceTimeZone(), []);
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState<"idle" | "busy" | "denied">("idle");
  const [found, setFound] = useState<{ city: CityZone; km: number } | null>(null);
  const all = useMemo(() => browserZones(), []);
  const results = useMemo(() => searchZones(query, all), [query, all]);

  const mainTz = config.timeZone === "local" ? device : config.timeZone;
  const mainName = config.label || (config.timeZone === "local" ? t("myLocation") : cityName(config.timeZone));
  const set = (patch: Partial<ClockConfig>) => setConfig({ ...config, ...patch });
  const full = config.zones.length >= CLOCK_MAX_ZONES;

  const at = (tz: string, seconds = false) =>
    date ? formatTime(date, { seconds, timeZone: tz, hour12: config.hour12 }) : "--:--";
  const dateLine = (tz: string) =>
    date
      ? new Intl.DateTimeFormat("de-DE", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(date)
      : "";
  const offset = (tz: string) => (date ? utcOffsetLabel(tz, date) : "");

  const makeMain = (tz: string, label: string) => set({ timeZone: tz, label });
  const addZone = (tz: string, label: string) => {
    if (full || config.zones.some((z) => z.timeZone === tz)) return;
    set({ zones: [...config.zones, { timeZone: tz, label }] });
  };
  const removeZone = (tz: string) => set({ zones: config.zones.filter((z) => z.timeZone !== tz) });
  const promote = (tz: string, label: string) => {
    // the main clock moves into the list, the chosen zone becomes the main clock
    const oldMain: { timeZone: string; label: string }[] =
      config.timeZone === "local" ? [] : [{ timeZone: config.timeZone, label: config.label }];
    const rest = [...oldMain, ...config.zones.filter((z) => z.timeZone !== tz)].slice(0, CLOCK_MAX_ZONES);
    set({ timeZone: tz, label, zones: rest });
  };

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setLocating("denied");
      return;
    }
    setLocating("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFound(nearestCity(pos.coords.latitude, pos.coords.longitude));
        setLocating("idle");
      },
      () => setLocating("denied"),
      { maximumAge: 10 * 60_000, timeout: 15_000 },
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Section title={t("main")}>
          <div className="text-center">
            <p className="text-dim">{mainName}</p>
            <p className="tabular text-6xl font-semibold leading-tight sm:text-7xl" data-testid="app-clock-main">
              <span suppressHydrationWarning>{at(mainTz, true)}</span>
            </p>
            <p className="text-dim" suppressHydrationWarning>
              {dateLine(mainTz)} · {offset(mainTz)}
            </p>
          </div>
          <Toggle checked={config.showSeconds} onChange={(v) => set({ showSeconds: v })} label={t("seconds")} />
          <Toggle checked={config.hour12} onChange={(v) => set({ hour12: v })} label={t("hour12")} />
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("name")}</span>
            <input
              className="input"
              maxLength={24}
              value={config.label}
              placeholder={config.timeZone === "local" ? t("myLocation") : cityName(config.timeZone)}
              onChange={(e) => set({ label: e.target.value })}
            />
          </label>
        </Section>

        <Section title={t("myTime")} hint={t("myTimeHint")}>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 p-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{t("deviceZone", { zone: device })}</p>
              <p className="tabular text-sm text-dim" suppressHydrationWarning>
                {at(device)} · {offset(device)}
              </p>
            </div>
            <button
              type="button"
              className={`btn shrink-0 ${config.timeZone === "local" ? "btn-primary" : ""}`}
              onClick={() => makeMain("local", "")}
              aria-pressed={config.timeZone === "local"}
            >
              {config.timeZone === "local" ? t("isMain") : t("useLocal")}
            </button>
          </div>
          <button type="button" className="btn w-full" onClick={locate} disabled={locating === "busy"}>
            <LocateFixed size={18} aria-hidden="true" />
            {locating === "busy" ? t("locating") : t("locate")}
          </button>
          {locating === "denied" ? (
            <p className="text-sm text-warning" role="status">
              {t("locateDenied")}
            </p>
          ) : null}
          {found ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3" role="status">
              <div className="min-w-0">
                <p className="truncate font-medium">{t("nearest", { city: found.city.city })}</p>
                <p className="text-sm text-dim">
                  {found.city.tz} · {t("kmAway", { km: found.km })}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary shrink-0"
                onClick={() => {
                  makeMain(found.city.tz, found.city.city);
                  setFound(null);
                }}
              >
                {t("apply")}
              </button>
            </div>
          ) : null}
        </Section>
      </div>

      <div className="space-y-4">
        <Section title={t("zones")} hint={t("zonesHint", { max: CLOCK_MAX_ZONES })}>
          {config.zones.length === 0 ? <p className="text-dim">{t("noZones")}</p> : null}
          <ul className="space-y-2">
            {config.zones.map((z) => (
              <li
                key={z.timeZone}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 pl-3"
                data-zone={z.timeZone}
              >
                <div className="min-w-0 flex-1 py-2">
                  <p className="truncate font-medium">{z.label || cityName(z.timeZone)}</p>
                  <p className="text-sm text-dim" suppressHydrationWarning>
                    {offset(z.timeZone)}
                  </p>
                </div>
                <span className="tabular text-xl font-semibold" suppressHydrationWarning>
                  {at(z.timeZone)}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-label={t("makeMain", { name: z.label || cityName(z.timeZone) })}
                  title={t("makeMainShort")}
                  onClick={() => promote(z.timeZone, z.label || cityName(z.timeZone))}
                >
                  <Star size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-label={t("remove", { name: z.label || cityName(z.timeZone) })}
                  onClick={() => removeZone(z.timeZone)}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t("add")}>
          <input
            className="input"
            type="search"
            value={query}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            onChange={(e) => setQuery(e.target.value)}
          />
          {results.length === 0 ? <p className="text-dim">{t("noResults")}</p> : null}
          <ul className="space-y-2" data-testid="zone-results">
            {results.map((r) => {
              const added = config.zones.some((z) => z.timeZone === r.tz);
              const isMain = config.timeZone === r.tz;
              return (
                <li key={r.tz} className="flex items-center gap-2 rounded-xl border border-border pl-3">
                  <div className="min-w-0 flex-1 py-2">
                    <p className="truncate font-medium">{r.city}</p>
                    <p className="truncate text-sm text-dim">{r.country}</p>
                  </div>
                  <span className="tabular text-lg" suppressHydrationWarning>
                    {at(r.tz)}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    aria-label={t("setMain", { name: r.city })}
                    title={t("setMainShort")}
                    disabled={isMain}
                    onClick={() => promote(r.tz, r.city)}
                  >
                    <Star size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="btn"
                    aria-label={t("addZone", { name: r.city })}
                    disabled={added || isMain || full}
                    onClick={() => addZone(r.tz, r.city)}
                  >
                    <Plus size={18} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      </div>
    </div>
  );
}
