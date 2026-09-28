"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type Tri = "yes" | "no" | "partial" | "unknown";

function stamp() {
  return new Date().toLocaleTimeString("de-DE", { hour12: false });
}

/** In-car test tool (gate G0). Internal tool: German copy inline. */
export function DriveTest() {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [ping, setPing] = useState<{
    ok: number;
    failed: number;
    last: string | null;
    latency: number | null;
    n: number | null;
  }>({
    ok: 0,
    failed: 0,
    last: null,
    latency: null,
    n: null,
  });
  const latencies = useRef<number[]>([]);
  const [visLog, setVisLog] = useState<string[]>([]);
  const [onlineLog, setOnlineLog] = useState<string[]>([]);
  const [online, setOnline] = useState(true);
  const [env, setEnv] = useState({ ua: "", w: 0, h: 0, dpr: 1 });
  const [wakeLock, setWakeLock] = useState("—");
  const [sent, setSent] = useState<"idle" | "busy" | "ok" | "error">("idle");

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const measure = () =>
      setEnv({ ua: navigator.userAgent, w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio });
    measure();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read browser state after mount (SSR-safe)
    setOnline(navigator.onLine);
    const onVis = () => setVisLog((l) => [...l, `${stamp()} ${document.visibilityState}`].slice(-50));
    const onOnline = () => {
      setOnline(true);
      setOnlineLog((l) => [...l, `${stamp()} online`].slice(-50));
    };
    const onOffline = () => {
      setOnline(false);
      setOnlineLog((l) => [...l, `${stamp()} offline`].slice(-50));
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", measure);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if ("wakeLock" in navigator) {
      navigator.wakeLock
        .request("screen")
        .then(() => setWakeLock("aktiv"))
        .catch((e: Error) => setWakeLock(`abgelehnt (${e.name})`));
    } else setWakeLock("nicht unterstützt");

    const doPing = async () => {
      const t0 = performance.now();
      try {
        const res = await fetch("/api/tools/ping", { cache: "no-store" });
        const body = (await res.json()) as { serverTime: string; n: number };
        const ms = Math.round(performance.now() - t0);
        latencies.current = [...latencies.current, ms].slice(-100);
        setPing((p) => ({ ...p, ok: p.ok + 1, last: body.serverTime, latency: ms, n: body.n }));
      } catch {
        setPing((p) => ({ ...p, failed: p.failed + 1 }));
      }
    };
    void doPing();
    const pinger = setInterval(doPing, 5000);
    return () => {
      clearInterval(tick);
      clearInterval(pinger);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", measure);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const counter = Math.floor((now - start) / 1000);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const tri = (k: string) => (String(f.get(k) ?? "unknown") as Tri) || "unknown";
    const avg = latencies.current.length
      ? latencies.current.reduce((a, b) => a + b, 0) / latencies.current.length
      : null;
    setSent("busy");
    try {
      const res = await fetch("/api/tools/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: String(f.get("model") ?? ""),
          softwareVersion: String(f.get("softwareVersion") ?? ""),
          region: String(f.get("region") ?? ""),
          buildYear: f.get("buildYear") ? Number(f.get("buildYear")) : null,
          visibleWhileDriving: tri("visible"),
          counterKeptRunning: tri("counter"),
          networkActive: tri("network"),
          notes: String(f.get("notes") ?? ""),
          userAgent: env.ua.slice(0, 400),
          viewport: { w: env.w, h: env.h },
          devicePixelRatio: env.dpr,
          measurements: {
            counter,
            pingsOk: ping.ok,
            pingsFailed: ping.failed,
            avgLatencyMs: avg == null ? null : Math.round(avg),
            visibilityLog: visLog,
            onlineLog,
          },
        }),
      });
      setSent(res.ok ? "ok" : "error");
    } catch {
      setSent("error");
    }
  };

  const triSelect = (name: string, label: string) => (
    <label className="block space-y-1">
      <span className="text-sm">{label}</span>
      <select name={name} className="input" defaultValue="unknown">
        <option value="yes">Ja</option>
        <option value="partial">Teilweise</option>
        <option value="no">Nein</option>
        <option value="unknown">Unklar</option>
      </select>
    </label>
  );

  return (
    <main className="min-h-dvh p-4 grid gap-4 lg:grid-cols-2">
      <section className="card p-6 space-y-3">
        <p className="text-dim text-sm">G0 Drive-Test · Seite offen lassen, losfahren, Beifahrer beobachtet</p>
        <p className="text-7xl font-bold tabular" data-testid="clock">
          {new Date(now).toLocaleTimeString("de-DE", { hour12: false })}
        </p>
        <p className="text-4xl tabular">
          Zähler: <strong data-testid="counter">{counter}</strong> s
        </p>
        <p className="tabular">
          Ping: {ping.ok} ok / {ping.failed} Fehler · Latenz {ping.latency ?? "—"} ms · Zufallszahl {ping.n ?? "—"}
        </p>
        <p className="tabular text-sm text-dim">Letzte Serverzeit: {ping.last ?? "—"}</p>
        <p>
          Netz: <strong className={online ? "text-positive" : "text-negative"}>{online ? "online" : "offline"}</strong>{" "}
          · Wake Lock: {wakeLock}
        </p>
        <p className="text-sm text-dim break-all">UA: {env.ua}</p>
        <p className="text-sm text-dim tabular">
          Viewport {env.w}×{env.h} · DPR {env.dpr}
        </p>
        <div className="grid grid-cols-2 gap-3 text-xs text-dim">
          <div>
            <p className="font-semibold">visibilitychange</p>
            <ul>
              {visLog.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold">online/offline</p>
            <ul>
              {onlineLog.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <form className="card p-6 space-y-3" onSubmit={submit}>
        <h2 className="text-xl font-semibold">Ergebnis senden (nach der Fahrt, im Stand)</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-sm">Modell (neutral, z. B. „Limousine 2021“)</span>
            <input name="model" className="input" maxLength={60} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Software-Version</span>
            <input name="softwareVersion" className="input" maxLength={40} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Region</span>
            <input name="region" className="input" maxLength={40} defaultValue="DE" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm">Baujahr</span>
            <input name="buildYear" type="number" min={2008} max={2100} className="input" />
          </label>
        </div>
        {triSelect("visible", "Seite blieb während der Fahrt sichtbar?")}
        {triSelect("counter", "Zähler lief weiter?")}
        {triSelect("network", "Netz/Ping aktiv?")}
        <label className="block space-y-1">
          <span className="text-sm">Notizen (keine personenbezogenen Daten)</span>
          <textarea name="notes" className="input" maxLength={2000} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={sent === "busy"}>
          Ergebnis senden
        </button>
        {sent === "ok" ? <p className="text-positive">Danke, gespeichert.</p> : null}
        {sent === "error" ? <p className="text-negative">Senden fehlgeschlagen.</p> : null}
      </form>
    </main>
  );
}
