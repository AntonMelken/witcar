"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { FieldSpec } from "@/widgets/types";
import type { WeatherLocation } from "@/widgets/weather/definition";
import { LocationPicker } from "./LocationPicker";

/** Generic config form rendered from a widget's declarative field list. */
export function ConfigForm({
  fields,
  config,
  onChange,
  maxListItems,
  disabled,
}: {
  fields: FieldSpec[];
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown, coalesce?: boolean) => void;
  maxListItems: number;
  disabled?: boolean;
}) {
  const t = useTranslations("widgets");
  return (
    <fieldset className="space-y-4" disabled={disabled}>
      {fields.map((f) => {
        const value = config[f.key];
        switch (f.kind) {
          case "boolean":
            return (
              <label key={f.key} className="flex items-center gap-3 min-h-12 cursor-pointer">
                <input
                  type="checkbox"
                  className="size-6"
                  checked={!!value}
                  onChange={(e) => onChange(f.key, e.target.checked)}
                />
                <span>{t(f.label)}</span>
              </label>
            );
          case "number":
            return (
              <label key={f.key} className="block space-y-1">
                <span className="text-sm font-medium">{t(f.label)}</span>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min={f.min}
                  max={f.max}
                  step={f.step ?? 1}
                  value={typeof value === "number" ? value : f.min}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10);
                    if (Number.isFinite(n)) onChange(f.key, Math.min(f.max, Math.max(f.min, n)), true);
                  }}
                />
              </label>
            );
          case "text":
            return (
              <label key={f.key} className="block space-y-1">
                <span className="text-sm font-medium">{t(f.label)}</span>
                <input
                  className="input"
                  maxLength={f.maxLength}
                  value={String(value ?? "")}
                  onChange={(e) => onChange(f.key, e.target.value, true)}
                />
              </label>
            );
          case "textarea":
            return (
              <label key={f.key} className="block space-y-1">
                <span className="text-sm font-medium">{t(f.label)}</span>
                <textarea
                  className="input"
                  maxLength={f.maxLength}
                  value={String(value ?? "")}
                  onChange={(e) => onChange(f.key, e.target.value, true)}
                />
                <span className="text-xs text-dim tabular">
                  {String(value ?? "").length}/{f.maxLength}
                </span>
              </label>
            );
          case "select":
            return (
              <label key={f.key} className="block space-y-1">
                <span className="text-sm font-medium">{t(f.label)}</span>
                <select className="input" value={String(value ?? "")} onChange={(e) => onChange(f.key, e.target.value)}>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label.includes(".") ? t(o.label) : o.label}
                    </option>
                  ))}
                </select>
              </label>
            );
          case "list":
            return (
              <ListField
                key={f.key}
                label={t(f.label)}
                placeholder={f.placeholder}
                pattern={new RegExp(f.pattern)}
                transform={f.transform}
                items={Array.isArray(value) ? (value as string[]) : []}
                max={Math.min(f.maxItems, maxListItems)}
                onChange={(items) => onChange(f.key, items)}
              />
            );
          case "location":
            return (
              <div key={f.key} className="space-y-1">
                <span className="text-sm font-medium">{t(f.label)}</span>
                <LocationPicker
                  value={(value as WeatherLocation | null) ?? null}
                  onChange={(loc) => onChange(f.key, loc)}
                />
              </div>
            );
        }
      })}
    </fieldset>
  );
}

function ListField({
  label,
  placeholder,
  pattern,
  transform,
  items,
  max,
  onChange,
}: {
  label: string;
  placeholder: string;
  pattern: RegExp;
  transform?: "upper" | "lower";
  items: string[];
  max: number;
  onChange: (items: string[]) => void;
}) {
  const t = useTranslations("editor");
  const [draft, setDraft] = useState("");
  const normalized =
    transform === "upper"
      ? draft.trim().toUpperCase()
      : transform === "lower"
        ? draft.trim().toLowerCase()
        : draft.trim();
  const valid = pattern.test(normalized) && !items.includes(normalized);
  const full = items.length >= max;
  const add = () => {
    if (!valid || full) return;
    onChange([...items, normalized]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <ul className="flex flex-wrap gap-2">
        {items.map((it) => (
          <li key={it} className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface-2 pl-3">
            <span className="tabular">{it}</span>
            <button
              type="button"
              className="min-h-12 min-w-12 inline-flex items-center justify-center"
              aria-label={t("removeItem", { item: it })}
              disabled={items.length <= 1}
              onClick={() => onChange(items.filter((x) => x !== it))}
            >
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          className="input"
          value={draft}
          placeholder={placeholder}
          aria-label={label}
          disabled={full}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn" onClick={add} disabled={!valid || full}>
          {t("addItem")}
        </button>
      </div>
      {full ? <p className="text-xs text-dim">{t("listFull", { max })}</p> : null}
    </div>
  );
}
