"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

interface StartResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  qrSvg: string;
  expiresIn: number;
  interval: number;
}

type Phase =
  | { kind: "loading" }
  | { kind: "ready"; data: StartResponse; expiresAt: number }
  | { kind: "error" }
  | { kind: "done" };

export function PairScreen() {
  const t = useTranslations("pair");
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [now, setNow] = useState(() => Date.now());
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(async () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    setPhase({ kind: "loading" });
    try {
      const res = await fetch("/api/device/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as StartResponse;
      setPhase({ kind: "ready", data, expiresAt: Date.now() + data.expiresIn * 1000 });
    } catch {
      setPhase({ kind: "error" });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kick off pairing on mount
    void start();
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [start]);

  // Poll every `interval` seconds with backoff on errors.
  useEffect(() => {
    if (phase.kind !== "ready") return;
    let failures = 0;
    let stopped = false;
    const poll = async () => {
      if (stopped) return;
      let delay = phase.data.interval * 1000;
      try {
        const res = await fetch("/api/device/poll", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ deviceCode: phase.data.deviceCode }),
        });
        if (res.status === 429) delay += 2000;
        else if (!res.ok) throw new Error(String(res.status));
        else {
          const body = (await res.json()) as { status: string };
          if (body.status === "approved") {
            setPhase({ kind: "done" });
            window.location.replace("/dashboard");
            return;
          }
          if (body.status === "expired") {
            void start();
            return;
          }
          failures = 0;
        }
      } catch {
        failures++;
        delay = Math.min(30_000, delay * 2 ** failures);
      }
      if (!stopped) pollTimer.current = setTimeout(poll, delay);
    };
    pollTimer.current = setTimeout(poll, phase.data.interval * 1000);
    return () => {
      stopped = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [phase, start]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restart when the code expired
    if (phase.kind === "ready" && now > phase.expiresAt) void start();
  }, [now, phase, start]);

  if (phase.kind === "error") {
    return (
      <div className="card p-8 text-center space-y-4">
        <p>{t("error")}</p>
        <button type="button" className="btn btn-primary" onClick={() => void start()}>
          {t("retry")}
        </button>
      </div>
    );
  }
  if (phase.kind !== "ready") return <p className="text-dim">{phase.kind === "done" ? t("success") : t("loading")}</p>;

  const left = Math.max(0, Math.round((phase.expiresAt - now) / 1000));
  return (
    <div className="card p-8 grid gap-8 md:grid-cols-[auto_1fr] items-center max-w-3xl">
      <div
        className="size-64 rounded-2xl bg-white p-3 [&_svg]:size-full"
        role="img"
        aria-label={t("qrLabel")}
        dangerouslySetInnerHTML={{ __html: phase.data.qrSvg }}
      />
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <ol className="list-decimal pl-6 space-y-2 text-dim text-lg">
          <li>{t("step1")}</li>
          <li>{t("step2", { url: phase.data.verificationUri.replace(/^https?:\/\//, "") })}</li>
          <li>{t("step3")}</li>
        </ol>
        <p className="text-5xl font-bold tracking-[0.15em] tabular" data-testid="user-code">
          {phase.data.userCode}
        </p>
        <p className="text-dim text-sm tabular">
          {t("expires", { min: Math.floor(left / 60), sec: String(left % 60).padStart(2, "0") })}
        </p>
      </div>
    </div>
  );
}
