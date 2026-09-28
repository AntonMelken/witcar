"use client";

import { useT } from "@/i18n/lite";
import { useState } from "react";

/** One-time driving safety notice before the first drive mode start (§2.3). */
export function DriveSafetyGate() {
  const t = useT("drive.safety");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const accept = async () => {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/profile/safety-ack", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      window.location.reload();
    } catch {
      setError(true);
      setBusy(false);
    }
  };

  return (
    <main className="min-h-dvh flex items-center justify-center p-6">
      <div className="card max-w-xl p-8 space-y-5">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-dim leading-relaxed">{t("body")}</p>
        <ul className="list-disc pl-6 text-dim space-y-1">
          <li>{t("rule1")}</li>
          <li>{t("rule2")}</li>
          <li>{t("rule3")}</li>
        </ul>
        <p className="text-sm text-warning">{t("experimental")}</p>
        <label className="flex items-start gap-3 min-h-12 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 size-6"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span>{t("confirm")}</span>
        </label>
        {error ? <p className="text-negative text-sm">{t("error")}</p> : null}
        <div className="flex gap-3">
          <button type="button" className="btn btn-primary" disabled={!checked || busy} onClick={accept}>
            {t("start")}
          </button>
          <a href="/dashboard" className="btn">
            {t("back")}
          </a>
        </div>
      </div>
    </main>
  );
}
