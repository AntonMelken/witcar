"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** Reads the session from the magic-link fragment and hands it to the server once. */
export function ConfirmLogin({ next }: { next: string }) {
  const t = useTranslations("auth");
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // the fragment is consumed below, so a second (Strict Mode) run would see nothing
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    // tokens must not linger in the address bar or history
    history.replaceState(null, "", window.location.pathname + window.location.search);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot result of reading the URL
      setFailed(true);
      return;
    }
    void fetch("/api/auth/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessToken, refreshToken }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        window.location.replace(next);
      })
      .catch(() => setFailed(true));
  }, [next]);

  if (!failed) {
    return (
      <p className="text-dim" role="status">
        {t("confirming")}
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-negative" role="alert">
        {t("linkError")}
      </p>
      <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn btn-primary w-full">
        {t("backToLogin")}
      </Link>
    </div>
  );
}
