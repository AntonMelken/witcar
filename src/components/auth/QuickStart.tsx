"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

/** One tap in the car: account without e-mail, starter dashboard, done. */
export function QuickStart() {
  const t = useTranslations("auth");
  const [state, setState] = useState<"idle" | "busy" | "error" | "rateLimited">("idle");

  const start = async () => {
    setState("busy");
    try {
      const res = await fetch("/api/device/quick-start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) return window.location.replace("/dashboard");
      setState(res.status === 429 ? "rateLimited" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="card p-8 space-y-4 text-center">
      <h1 className="text-3xl font-bold">{t("quickTitle")}</h1>
      <p className="text-dim text-lg">{t("quickText")}</p>
      <button
        type="button"
        className="btn btn-primary w-full text-xl py-5"
        onClick={() => void start()}
        disabled={state === "busy"}
      >
        {state === "busy" ? t("quickBusy") : t("quickButton")}
      </button>
      {state === "error" || state === "rateLimited" ? (
        <p className="text-negative text-sm" role="alert">
          {t(state === "rateLimited" ? "rateLimited" : "quickError")}
        </p>
      ) : null}
    </div>
  );
}
