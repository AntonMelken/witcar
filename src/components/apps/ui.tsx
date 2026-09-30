"use client";

import type { ReactNode } from "react";

/** Building blocks shared by the widget apps (loaded together with an app, not with the dashboard). */
export function Section({
  title,
  hint,
  actions,
  children,
}: {
  title: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card space-y-3 p-4">
      <header className="flex items-center gap-2">
        <h3 className="flex-1 text-lg font-semibold">{title}</h3>
        {actions}
      </header>
      {hint ? <p className="text-sm text-dim">{hint}</p> : null}
      {children}
    </section>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3">
      <input type="checkbox" className="size-6" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

/** Segmented control (radio-like buttons), e.g. chart ranges. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex overflow-hidden rounded-[14px] border border-border">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          className={`min-h-12 min-w-14 px-4 font-semibold ${
            o.value === value ? "bg-accent text-accent-contrast" : "bg-surface-2 text-text"
          }`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
