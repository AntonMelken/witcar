"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

export function LoginForm({ mode, next }: { mode: "supabase" | "dev"; next: string }) {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setState("busy");
    try {
      const res = await fetch(mode === "dev" ? "/api/auth/dev-login" : "/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "dev" ? { email } : { email, next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      if (mode === "dev") window.location.assign(next);
      else setState("sent");
    } catch {
      setState("error");
    }
  };

  if (state === "sent") {
    return (
      <p className="rounded-xl border border-accent/50 bg-accent/10 p-4" role="status">
        {t("sent", { email })}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium">{t("email")}</span>
        <input
          className="input"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <button type="submit" className="btn btn-primary w-full" disabled={state === "busy"}>
        {mode === "dev" ? t("devLogin") : t("sendLink")}
      </button>
      {mode === "dev" ? <p className="text-xs text-warning">{t("devHint")}</p> : null}
      {state === "error" ? (
        <p className="text-negative text-sm" role="alert">
          {t("error")}
        </p>
      ) : null}
    </form>
  );
}
