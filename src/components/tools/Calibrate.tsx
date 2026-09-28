"use client";

import { useEffect, useState } from "react";

const SWATCHES = ["#000000", "#08090b", "#0c0d10", "#0f1114", "#131519", "#17191d", "#1b1d21", "#202226"];

/** Calibration tool (gate G1): viewport, insets and background matching. Internal tool: German copy inline. */
export function Calibrate() {
  const [m, setM] = useState({ w: 0, h: 0, sw: 0, sh: 0, dpr: 1, vvw: 0, vvh: 0 });
  const [bg, setBg] = useState<string | null>(null);

  useEffect(() => {
    const measure = () =>
      setM({
        w: window.innerWidth,
        h: window.innerHeight,
        sw: window.screen.width,
        sh: window.screen.height,
        dpr: window.devicePixelRatio,
        vvw: Math.round(window.visualViewport?.width ?? 0),
        vvh: Math.round(window.visualViewport?.height ?? 0),
      });
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  if (bg) {
    return (
      <button
        type="button"
        className="fixed inset-0 w-full h-full"
        style={{ background: bg }}
        onClick={() => setBg(null)}
      >
        <span className="text-dim text-sm">{bg} · tippen zum Zurückkehren</span>
      </button>
    );
  }

  const ruler = (side: "top" | "bottom" | "left" | "right") => (
    <div
      aria-hidden="true"
      className="fixed pointer-events-none"
      style={{
        [side]: 0,
        ...(side === "top" || side === "bottom"
          ? { left: 0, right: 0, height: 120 }
          : { top: 0, bottom: 0, width: 120 }),
        backgroundImage: `repeating-linear-gradient(${side === "top" ? "to bottom" : side === "bottom" ? "to top" : side === "left" ? "to right" : "to left"}, var(--accent) 0 1px, transparent 1px 10px)`,
        opacity: 0.5,
      }}
    />
  );

  return (
    <main className="min-h-dvh p-[130px]">
      {ruler("top")}
      {ruler("bottom")}
      {ruler("left")}
      {ruler("right")}
      <div className="card p-6 space-y-4 max-w-3xl mx-auto relative">
        <h1 className="text-2xl font-bold">Kalibrierung (G1)</h1>
        <p className="tabular text-lg" data-testid="viewport">
          Viewport {m.w}×{m.h} · Visual Viewport {m.vvw}×{m.vvh} · Screen {m.sw}×{m.sh} · DPR {m.dpr}
        </p>
        <p className="text-dim text-sm">
          Linien am Rand: alle 10 px. Zähle, wie viele Linien oben/unten/links/rechts von Fahrzeug-UI verdeckt sind (=
          Safe-Insets).
        </p>
        <h2 className="font-semibold">Hintergrund-Abgleich</h2>
        <p className="text-dim text-sm">
          Farbfeld antippen → Vollbild. Welches Feld passt am besten zum Fahrzeug-Display-Dunkel?
        </p>
        <div className="grid grid-cols-4 gap-3">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              className="h-20 rounded-xl border border-border text-xs text-dim"
              style={{ background: c }}
              onClick={() => setBg(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <pre className="text-xs bg-surface-2 rounded-xl p-3 overflow-x-auto">
          {JSON.stringify(
            {
              viewport: { w: m.w, h: m.h },
              visualViewport: { w: m.vvw, h: m.vvh },
              screen: { w: m.sw, h: m.sh },
              dpr: m.dpr,
            },
            null,
            2,
          )}
        </pre>
        <p className="text-dim text-sm">
          Werte bitte mit Modell/Baujahr/Software-Version in DECISIONS.md (D-011) eintragen.
        </p>
      </div>
    </main>
  );
}
