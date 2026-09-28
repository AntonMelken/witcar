"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export function LinkForm({ initialCode }: { initialCode: string }) {
  const t = useTranslations("link");
  const [code, setCode] = useState(initialCode);
  const [label, setLabel] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | string>("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch("/api/device/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userCode: code, label: label || undefined }),
      });
      if (res.ok) return setState("done");
      const body = (await res.json().catch(() => ({}))) as { error?: { code?: string } };
      setState(body.error?.code ?? "error");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="space-y-4" role="status">
        <p className="rounded-xl border border-positive/50 bg-positive/10 p-4">{t("success")}</p>
        <Link href="/settings" className="btn w-full">
          {t("manageDevices")}
        </Link>
      </div>
    );
  }

  const errorKey = ["invalid_code", "not_found", "device_limit", "rate_limited"].includes(state) ? state : "error";
  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium">{t("code")}</span>
        <input
          className="input text-2xl tracking-[0.2em] uppercase tabular"
          name="code"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          required
          maxLength={12}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ABCD-EFGH"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-medium">{t("label")}</span>
        <input
          className="input"
          name="label"
          maxLength={60}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("labelPlaceholder")}
        />
      </label>
      <button type="submit" className="btn btn-primary w-full" disabled={state === "busy"}>
        {t("submit")}
      </button>
      {state !== "idle" && state !== "busy" ? (
        <p className="text-negative text-sm" role="alert">
          {t(`errors.${errorKey}`)}
        </p>
      ) : null}
    </form>
  );
}
