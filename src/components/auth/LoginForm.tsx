"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

type State = "idle" | "busy" | "error" | "rateLimited" | "codeError";

async function post(url: string, body: unknown): Promise<"ok" | "rateLimited" | "error"> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok ? "ok" : res.status === 429 ? "rateLimited" : "error";
  } catch {
    return "error";
  }
}

/**
 * E-mail sign-in in two steps: the mail carries a link (works in any browser)
 * and a code; typing the code logs in *this* browser, e.g. the car while the
 * mail is read on the phone.
 */
export function LoginForm({ mode, next }: { mode: "supabase" | "dev"; next: string }) {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [state, setState] = useState<State>("idle");

  const errorText = state === "idle" || state === "busy" ? null : t(state);
  const errorLine = errorText ? (
    <p className="text-negative text-sm" role="alert">
      {errorText}
    </p>
  ) : null;

  const sendMail = async (e: FormEvent) => {
    e.preventDefault();
    setState("busy");
    const result = await post(
      mode === "dev" ? "/api/auth/dev-login" : "/api/auth/magic-link",
      mode === "dev" ? { email } : { email, next },
    );
    if (result !== "ok") return setState(result);
    if (mode === "dev") return window.location.assign(next);
    setSent(true);
    setState("idle");
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setState("busy");
    const result = await post("/api/auth/verify-code", { email, code });
    if (result === "ok") return window.location.assign(next);
    setState(result === "rateLimited" ? "rateLimited" : "codeError");
  };

  if (sent) {
    return (
      <form onSubmit={verify} className="space-y-4">
        <p className="rounded-xl border border-accent/50 bg-accent/10 p-4" role="status">
          {t("sent", { email })}
        </p>
        <label className="block space-y-2">
          <span className="text-sm font-medium">{t("code")}</span>
          <input
            className="input text-center text-2xl tracking-[0.3em] tabular-nums"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6,10}"
            maxLength={10}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </label>
        <button type="submit" className="btn btn-primary w-full" disabled={state === "busy" || code.length < 6}>
          {t("verify")}
        </button>
        {errorLine}
        <button
          type="button"
          className="text-sm text-dim underline"
          onClick={() => {
            setCode("");
            setSent(false);
            setState("idle");
          }}
        >
          {t("changeEmail")}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendMail} className="space-y-4">
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
      {errorLine}
    </form>
  );
}
