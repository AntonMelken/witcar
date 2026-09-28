"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { findFreeSpot } from "@/lib/layout/grid";
import { newWidgetId, type LayoutWidget } from "@/lib/layout/schema";
import { PRESETS } from "@/lib/presets";
import { getWidgetMeta, widgetRegistry, type ActiveWidgetType } from "@/widgets/registry";
import type { WeatherLocation } from "@/widgets/weather/definition";
import { LocationPicker } from "./LocationPicker";
import { PresetShape } from "./PresetShape";

const CHOICES = (Object.keys(widgetRegistry) as ActiveWidgetType[]).filter((t) => !widgetRegistry[t].proOnly);
const MAX_START = 3;

/** Onboarding steps 2–4 (step 1 = login), phone-first (§13). */
export function Onboarding({ initialPreset, siteHost }: { initialPreset: string; siteHost: string }) {
  const t = useTranslations("onboarding");
  const tp = useTranslations("presets");
  const tw = useTranslations("widgets");
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [preset, setPreset] = useState(initialPreset);
  const [types, setTypes] = useState<ActiveWidgetType[]>(["clock", "weather", "stocks"]);
  const [location, setLocation] = useState<WeatherLocation | null>({ name: "Berlin", lat: 52.52, lon: 13.41 });
  const [safety, setSafety] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const toggle = (type: ActiveWidgetType) =>
    setTypes((cur) =>
      cur.includes(type) ? cur.filter((x) => x !== type) : cur.length < MAX_START ? [...cur, type] : cur,
    );

  const finish = async () => {
    setBusy(true);
    setError(false);
    const widgets: LayoutWidget[] = [];
    for (const type of types) {
      const meta = getWidgetMeta(type)!;
      const spot = findFreeSpot(widgets, meta.defaultSize.w, meta.defaultSize.h);
      if (!spot) continue;
      const config = type === "weather" ? { location } : (meta.defaultConfig as Record<string, unknown>);
      widgets.push({ widgetId: newWidgetId(type), type, ...spot, ...meta.defaultSize, config });
    }
    try {
      const r1 = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vehiclePreset: preset, onboarded: true }),
      });
      const r2 = await fetch("/api/layouts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: t("layoutName"), preset, mode: "standard", widgets, makeDefault: true }),
      });
      if (!r1.ok || (!r2.ok && r2.status !== 403)) throw new Error("save failed");
      if (safety) await fetch("/api/profile/safety-ack", { method: "POST" });
      router.push("/dashboard");
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  const steps = [t("stepPreset"), t("stepWidgets"), t("stepCar")];

  return (
    <main className="mx-auto max-w-xl p-5 space-y-6">
      <ol className="flex gap-2 text-sm" aria-label={t("progress")}>
        {steps.map((s, i) => (
          <li
            key={s}
            className={`flex-1 rounded-full h-2 ${i <= step ? "bg-accent" : "bg-surface-2"}`}
            aria-current={i === step ? "step" : undefined}
          >
            <span className="sr-only">{s}</span>
          </li>
        ))}
      </ol>
      <h1 className="text-2xl font-bold">{steps[step]}</h1>

      {step === 0 ? (
        <div className="space-y-3">
          <p className="text-dim">{t("presetIntro")}</p>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={`card w-full p-4 flex items-center gap-4 text-left min-h-16 ${preset === p.id ? "border-accent" : ""}`}
              aria-pressed={preset === p.id}
            >
              <PresetShape aspect={p.aspect} active={preset === p.id} />
              <span className="flex-1">
                <span className="block font-semibold">{tp(`${p.label}.name`)}</span>
                <span className="block text-sm text-dim">{tp(`${p.label}.hint`)}</span>
              </span>
              {preset === p.id ? <Check className="text-accent" aria-hidden="true" /> : null}
            </button>
          ))}
          <p className="text-xs text-dim">{t("presetEstimate")}</p>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-3">
          <p className="text-dim">{t("widgetsIntro", { max: MAX_START })}</p>
          <div className="grid grid-cols-2 gap-3">
            {CHOICES.map((type) => {
              const active = types.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggle(type)}
                  aria-pressed={active}
                  className={`card p-4 min-h-16 text-left font-medium flex items-center justify-between ${active ? "border-accent" : ""}`}
                >
                  {tw(`${type}.title`)}
                  {active ? <Check className="text-accent" size={18} aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
          {types.includes("weather") ? (
            <div className="card p-4 space-y-2">
              <p className="font-medium">{tw("weather.fields.location")}</p>
              <LocationPicker value={location} onChange={setLocation} />
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <ol className="list-decimal pl-6 space-y-2 text-dim">
            <li>{t("car1", { host: siteHost })}</li>
            <li>{t("car2")}</li>
            <li>{t("car3")}</li>
          </ol>
          <p className="rounded-xl border border-border bg-surface-2 p-4 text-sm">{t("hotspot")}</p>
          <label className="flex items-start gap-3 cursor-pointer min-h-12">
            <input
              type="checkbox"
              className="mt-1 size-6 shrink-0"
              checked={safety}
              onChange={(e) => setSafety(e.target.checked)}
            />
            <span className="text-sm">{t("safety")}</span>
          </label>
          {error ? <p className="text-negative text-sm">{t("error")}</p> : null}
        </div>
      ) : null}

      <div className="flex gap-3">
        {step > 0 ? (
          <button type="button" className="btn" onClick={() => setStep(step - 1)}>
            {t("back")}
          </button>
        ) : null}
        {step < 2 ? (
          <button
            type="button"
            className="btn btn-primary flex-1"
            onClick={() => setStep(step + 1)}
            disabled={step === 1 && types.length === 0}
          >
            {t("next")}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary flex-1"
            onClick={() => void finish()}
            disabled={busy || !safety}
          >
            {t("finish")}
          </button>
        )}
      </div>
    </main>
  );
}
