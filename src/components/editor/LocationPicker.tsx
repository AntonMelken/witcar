"use client";

import { MapPin, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { WeatherLocation } from "@/widgets/weather/definition";

interface GeoResult {
  name: string;
  lat: number;
  lon: number;
  country: string | null;
  admin1: string | null;
}

/** City search through our server proxy; no automatic geolocation (§16.2). */
export function LocationPicker({
  value,
  onChange,
}: {
  value: WeatherLocation | null;
  onChange: (loc: WeatherLocation) => void;
}) {
  const t = useTranslations("editor.location");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoResult[] | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const search = async () => {
    if (q.trim().length < 2) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/geo/search?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { results: GeoResult[]; source?: string };
      setResults(body.results);
      setSource(body.source ?? null);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {value ? (
        <p className="flex items-center gap-2 text-sm">
          <MapPin size={16} aria-hidden="true" className="text-accent" />
          {value.name}
        </p>
      ) : null}
      <div className="flex gap-2">
        <input
          className="input"
          value={q}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
        />
        <button type="button" className="btn" onClick={() => void search()} disabled={busy} aria-label={t("search")}>
          <Search size={18} />
        </button>
      </div>
      {error ? <p className="text-negative text-sm">{t("error")}</p> : null}
      {results ? (
        results.length === 0 ? (
          <p className="text-dim text-sm">{t("none")}</p>
        ) : (
          <ul className="space-y-1">
            {results.map((r) => (
              <li key={`${r.lat},${r.lon}`}>
                <button
                  type="button"
                  className="btn btn-ghost w-full justify-start text-left font-normal"
                  onClick={() => {
                    onChange({ name: r.name, lat: r.lat, lon: r.lon });
                    setResults(null);
                    setQ("");
                  }}
                >
                  {r.name}
                  <span className="text-dim text-sm">{[r.admin1, r.country].filter(Boolean).join(", ")}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
      {results && source === "nominatim" ? (
        // Nominatim results are OpenStreetMap data (ODbL): credit next to the results.
        <p className="text-dim text-xs">
          Ortssuche: Daten ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            OpenStreetMap-Mitwirkende
          </a>{" "}
          (ODbL)
        </p>
      ) : null}
      {results && source === "open-meteo-geo" ? (
        // Open-Meteo geocoding data comes from GeoNames (CC BY 4.0): credit + licence link next to the results.
        <p className="text-dim text-xs">
          Ortssuche:{" "}
          <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline">
            Open-Meteo.com
          </a>
          , Ortsdaten:{" "}
          <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer" className="underline">
            GeoNames
          </a>{" "}
          (
          <a
            href="https://creativecommons.org/licenses/by/4.0/deed.de"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            CC BY 4.0
          </a>
          )
        </p>
      ) : null}
    </div>
  );
}
