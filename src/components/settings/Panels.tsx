"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { PRESETS } from "@/lib/presets";
import type { Plan } from "@/lib/plan";

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-6 space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: { code: string } };
  if (!res.ok) throw new Error(data.error?.code ?? String(res.status));
  return data;
}

export function AppearancePanel({ theme, preset }: { theme: string; preset: string }) {
  const t = useTranslations("settings");
  const tp = useTranslations("presets");
  const [currentTheme, setTheme] = useState(theme);
  const [currentPreset, setPreset] = useState(preset);
  const [saved, setSaved] = useState(false);

  const update = async (patch: Record<string, string>) => {
    setSaved(false);
    await send("/api/profile", "PATCH", patch);
    if (patch.theme) document.documentElement.dataset.theme = patch.theme;
    setSaved(true);
  };

  return (
    <Panel title={t("appearance")}>
      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("theme")}</span>
        <select
          className="input"
          value={currentTheme}
          onChange={(e) => {
            setTheme(e.target.value);
            void update({ theme: e.target.value });
          }}
        >
          <option value="dark">{t("themeDark")}</option>
          <option value="light">{t("themeLight")}</option>
          <option value="auto">{t("themeAuto")}</option>
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("preset")}</span>
        <select
          className="input"
          value={currentPreset}
          onChange={(e) => {
            setPreset(e.target.value);
            void update({ vehiclePreset: e.target.value });
          }}
        >
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {tp(`${p.label}.name`)}
            </option>
          ))}
        </select>
      </label>
      {saved ? (
        <p className="text-sm text-dim" role="status">
          {t("saved")}
        </p>
      ) : null}
    </Panel>
  );
}

interface DeviceItem {
  id: string;
  label: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

export function DevicesPanel({ devices, max }: { devices: DeviceItem[]; max: number }) {
  const t = useTranslations("settings");
  const [items, setItems] = useState(devices);
  const [error, setError] = useState(false);
  const revoke = async (id: string) => {
    setError(false);
    try {
      await send(`/api/devices/${id}`, "DELETE");
      setItems((cur) => cur.filter((d) => d.id !== id));
    } catch {
      setError(true);
    }
  };
  const fmt = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "—";
  return (
    <Panel title={t("devices")}>
      <p className="text-sm text-dim">{t("devicesHint", { count: items.length, max })}</p>
      <ul className="divide-y divide-border">
        {items.map((d) => (
          <li key={d.id} className="py-3 flex items-center justify-between gap-4" data-device-id={d.id}>
            <div>
              <p className="font-medium">{d.label || t("deviceUnnamed")}</p>
              <p className="text-xs text-dim">{t("lastSeen", { date: fmt(d.lastSeenAt) })}</p>
            </div>
            <button type="button" className="btn btn-danger" onClick={() => void revoke(d.id)}>
              {t("revoke")}
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 ? <p className="text-dim text-sm">{t("noDevices")}</p> : null}
      {error ? <p className="text-negative text-sm">{t("error")}</p> : null}
      <Link href="/link" className="btn">
        {t("pairDevice")}
      </Link>
    </Panel>
  );
}

export function BillingPanel(props: {
  plan: Plan;
  status: string;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasCustomer: boolean;
  billingConfigured: boolean;
}) {
  const t = useTranslations("settings");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const portal = async () => {
    setBusy(true);
    setError(false);
    try {
      const { url } = await send("/api/billing/portal", "POST");
      if (url) window.location.assign(url);
    } catch {
      setError(true);
      setBusy(false);
    }
  };
  const end = props.periodEnd
    ? new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(new Date(props.periodEnd))
    : null;
  return (
    <Panel title={t("billing")}>
      <p data-testid="plan">
        {t("currentPlan")}: <strong>{props.plan === "pro" ? "Pro" : "Free"}</strong>
        {props.status === "past_due" ? <span className="text-warning"> · {t("pastDue")}</span> : null}
      </p>
      {end && props.plan === "pro" ? (
        <p className="text-sm text-dim">
          {props.cancelAtPeriodEnd ? t("endsOn", { date: end }) : t("renewsOn", { date: end })}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {props.plan === "free" ? (
          <Link href="/pricing" className="btn btn-primary">
            {t("upgrade")}
          </Link>
        ) : null}
        {props.hasCustomer && props.billingConfigured ? (
          <button type="button" className="btn" onClick={() => void portal()} disabled={busy}>
            {t("manageSubscription")}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-negative text-sm">{t("error")}</p> : null}
      <p className="text-xs text-dim">{t("downgradeNote")}</p>
    </Panel>
  );
}

export function AccountPanel({ email }: { email: string | null }) {
  const t = useTranslations("settings");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(false);
  const signOut = async () => {
    await send("/api/auth/signout", "POST").catch(() => undefined);
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR" });
    // full reload on purpose: drops all client state of the signed-out session
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  };
  const remove = async () => {
    setError(false);
    try {
      await send("/api/account", "DELETE", { confirm });
      navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR" });
      try {
        localStorage.clear();
      } catch {
        // ignore
      }
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload after deletion
      window.location.href = "/?deleted=1";
    } catch {
      setError(true);
    }
  };
  return (
    <Panel title={t("account")}>
      {email ? <p className="text-sm text-dim">{t("signedInAs", { email })}</p> : null}
      <div className="flex flex-wrap gap-2">
        <a href="/api/account/export" className="btn" download>
          {t("export")}
        </a>
        <button type="button" className="btn" onClick={() => void signOut()}>
          {t("signOut")}
        </button>
      </div>
      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-sm">{t("deleteHint")}</p>
        <div className="flex flex-wrap gap-2">
          <input
            className="input max-w-48"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-label={t("deleteConfirmLabel")}
            placeholder="LÖSCHEN"
          />
          <button
            type="button"
            className="btn btn-danger"
            disabled={confirm !== "LÖSCHEN"}
            onClick={() => void remove()}
          >
            {t("delete")}
          </button>
        </div>
        {error ? <p className="text-negative text-sm">{t("error")}</p> : null}
      </div>
    </Panel>
  );
}
