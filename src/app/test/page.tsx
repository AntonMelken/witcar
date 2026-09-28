import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/site/Logo";

export const metadata: Metadata = { title: "In-Car-Test", robots: { index: false } };

const STEPS = [
  {
    href: "/tools/drive-test",
    title: "1 · Fahrtest (G0)",
    text: "Seite offen lassen, losfahren, Beifahrer beobachtet Zähler und Ping.",
  },
  {
    href: "/tools/calibrate",
    title: "2 · Kalibrierung (G1)",
    text: "Bildschirmmaße, verdeckte Ränder und Hintergrundfarbe messen (im Stand).",
  },
  { href: "/demo", title: "3 · Demo-Dashboard", text: "So sieht WitCar ohne Konto aus." },
  {
    href: "/pair",
    title: "4 · Mit Handy koppeln",
    text: "QR-Code mit dem Handy scannen und das eigene Dashboard im Auto öffnen.",
  },
];

/** Short entry point for typing in the car browser (in-car tests, see docs/incar-test-protocol.md). */
export default function TestPage() {
  return (
    <main className="min-h-dvh mx-auto max-w-4xl p-6 space-y-6">
      <Logo size={36} />
      <h1 className="text-3xl font-bold">In-Car-Test</h1>
      <p className="text-dim">Bedienung nur im Stand. Während der Fahrt beobachtet ausschließlich der Beifahrer.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {STEPS.map((s) => (
          <Link key={s.href} href={s.href} className="card p-6 min-h-32 flex flex-col gap-2 hover:border-accent">
            <span className="text-xl font-semibold">{s.title}</span>
            <span className="text-dim">{s.text}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
