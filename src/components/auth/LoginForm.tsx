"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

/** Name-only sign-in (default) or the legacy e-mail link (Supabase mode). */
export function LoginForm({ mode, next }: { mode: "name" | "supabase"; next: string }) {
  const t = useTranslations("auth");
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error" | "invalid">("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch(mode === "name" ? "/api/auth/name-login" : "/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "name" ? { name: value } : { email: value, next }),
      });
      if (res.status === 400 && mode === "name") {
        setState("invalid");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      if (mode === "name") window.location.assign(next);
      else setState("sent");
    } catch {
      setState("error");
    }
  };

  if (state === "sent") {
    return (
      <p className="rounded-xl border border-border bg-surface-2 p-4" role="status">
        {t("sent", { email: value })}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium">{mode === "name" ? t("name") : t("email")}</span>
        <input
          className="input"
          name={mode === "name" ? "name" : "email"}
          type={mode === "name" ? "text" : "email"}
          autoComplete={mode === "name" ? "nickname" : "email"}
          inputMode={mode === "name" ? "text" : "email"}
          maxLength={mode === "name" ? 32 : 254}
          minLength={mode === "name" ? 2 : undefined}
          required
          autoFocus={mode === "name"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <button type="submit" className="btn btn-primary w-full" disabled={state === "busy" || value.trim().length < 2}>
        {mode === "name" ? t("continue") : t("sendLink")}
      </button>
      {mode === "name" ? <p className="text-xs text-dim">{t("nameHint")}</p> : null}
      {state === "invalid" ? (
        <p className="text-negative text-sm" role="alert">
          {t("invalidName")}
        </p>
      ) : null}
      {state === "error" ? (
        <p className="text-negative text-sm" role="alert">
          {t("error")}
        </p>
      ) : null}
    </form>
  );
}
