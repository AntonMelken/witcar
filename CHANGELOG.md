# Changelog

## [Unreleased]

### Apps in den Widgets, Zeitzonen, Wochenvorschau, Aktien-App, Namens-Login, weißes Design

- **Widget-Apps:** Ein Widget antippen öffnet eine Vollbild-App (Standardmodus; im Fahrmodus gibt es keine). Änderungen
  werden automatisch gespeichert (`PATCH /api/layouts/:id/widgets/:widgetId`), die öffentliche Demo speichert nicht.
- **Uhr:** Hauptuhr in beliebiger Zeitzone oder Ortszeit des Geräts, eigene Bezeichnung („Mein Standort“), Standort
  ermitteln (nächste Stadt, nur auf Tipp, nichts wird gesendet), bis zu 6 weitere Zeitzonen mit Stadt-/Land-Suche,
  12/24 h; das Widget passt sich der Größe an (Liste oder Spalten).
- **Wetter:** Vorhersage Heute bis Sonntag (Wochentage), bis zu 6 Orte (Ortssuche), Hauptort wählbar; Wochenstreifen im
  Widget bei genug Höhe, mehrere Orte als Liste.
- **Aktien wieder normal bedienbar + Aktien-App:** Watchlist, Suche, Kursverlauf (1 T/1 W/1 M/1 J) als Diagramm mit
  Fadenkreuz, gleitender Durchschnitt, Kennzahlen (Eröffnung, Hoch/Tief, 52 Wochen, Zeitraum), Positionsrechner.
  Anbieter Twelve Data (Verlauf/Suche) oder Finnhub; ohne Schlüssel gekennzeichnete Demo-Daten (D-033).
- **Timer:** freie Zeit von 1 s bis 24 h (Ziffernblock wie Mikrowelle, Schnellwahl, Feinjustierung, +1/+5 Min.), im
  Editor Stunden/Minuten/Sekunden; Zustand gilt für Widget und App.
- **Notizen:** bis zu 12 Notizen mit Titel, auswählen/bearbeiten/löschen, eine im Widget anzeigen.
- **Daten aktualisieren:** Button im Dashboard und in jeder App; „Aktualisiert 14:32“ bzw. Fehlerhinweis (D-036).
- **Anmeldung nur mit Namen**, voller Zugang ohne Einschränkungen (D-034); Dev-Login entfernt, Free/Pro bleibt per
  `WITCAR_OPEN_ACCESS=0` schaltbar.
- **Design:** Weiß/Schwarz, Standard weiß (D-035).
- Dashboard-Bundle 147,6 kB gzip durch Lazy-Loading je Widget-Typ; FAQ/Datenschutz/Landing angepasst.

### Kostenlose Datenquellen und Self-Hosting

- Wetter: MET Norway statt Open-Meteo (kostenlos, auch kommerziell, CC BY 4.0), Ortssuche über Nominatim/OpenStreetMap
  mit globalem Limit von 1 Anfrage/s; Quellenangaben im Widget, in der Ortssuche und auf `/lizenzen`.
- Krypto: CoinMarketCap Basic (kostenloser Key, kommerziell erlaubt) mit einem gemeinsamen Abruf der Top 250 je Währung
  alle 10 min; CoinGecko-Demo ist nicht kommerziell lizenziert (D-009 korrigiert).
- Neues Widget „Wechselkurse“ mit EZB-Referenzkursen; Aktien sind ohne lizenzierten Anbieter ausgeblendet
  (`STOCKS_PROVIDER=off`), bestehende Aktien-Kacheln zeigen einen Hinweis, `/demo` zeigt Wechselkurse.
- Upstash entfernt: Cache und Rate-Limits laufen über Postgres (`api_cache`), abgelaufene Zeilen werden aufgeräumt.
- `Dockerfile` + `NEXT_OUTPUT=standalone` und Anleitung `docs/deploy-hetzner.md` (Hetzner + Coolify) als günstige
  Alternative zu Vercel Pro.
- `/lizenzen` listet nur die tatsächlich aktiven Datenquellen; Datenschutzerklärung nennt die Datenquellen.
- Stale-Markierung richtet sich nach der Cache-Dauer des Anbieters (`staleAfterMs`).

### Lizenzen & Marken

- Quellenhinweise laut Anbieterbedingungen: „Wetterdaten: Open-Meteo.com“ (CC BY 4.0) im Wetter-Widget, Open-Meteo/GeoNames
  mit Lizenzlink in der Ortssuche, „Powered by CoinGecko“ als Link und jetzt auch im Fahrmodus (dort als reiner Text).
- Wetter-Widget kennzeichnet Mock-Daten als „Demo-Daten“ (wie Aktien/Krypto).
- Neue Seite `/lizenzen` (Datenquellen + Open-Source-Pakete) und `public/third-party-licenses.txt` mit allen Lizenztexten,
  erzeugt von `pnpm licenses:gen`; CI prüft Aktualität (`pnpm licenses:check`). Footer-Link „Lizenzen & Datenquellen“.
- Landing/FAQ: „getestet mit Tesla-Fahrzeugen“ ersetzt (G0/G1 noch offen), „aus der EU“ präzisiert auf Hosting in Frankfurt.
- Disclaimer nennt Fremdmarken allgemein; Lucide-Herkunft einzelner Dashboard-Icons dokumentiert.

## [0.1.0] – 2026-09-28 – MVP (Phasen 0–4, Test-Modus)

### Phase 0 – Fundament und Validierung

- Next.js 16.3 (App Router, TS strict), Tailwind 4, ESLint/Prettier, Husky + lint-staged, pnpm-Scripts.
- GitHub Actions CI: typecheck, lint, format, unit, build, E2E, `pnpm audit`; Dependabot.
- zod-validierte Umgebung (`src/lib/env.ts`), `.env.example`; Build scheitert ohne Pflichtwerte.
- Lokales Backend ohne externe Dienste (PGlite + Dev-Auth + Mock-Provider).
- `/tools/drive-test` (G0) mit Uhr, Sekundenzähler, Ping/Latenz, visibility-/online-Log, UA/Viewport/DPR, Wake-Lock-Status, Ergebnisformular → `incar_reports`.
- `/tools/calibrate` (G1) mit Viewport-Maßen, Rand-Linealen für Safe-Insets, Farbfeldern im Vollbild.
- `docs/incar-test-protocol.md`, `CLAUDE.md`, `DECISIONS.md`.

### Phase 1 – Design-System und Widget-Kern

- Tokens (dark/light/auto, kein Flackern), Inter lokal gehostet, Basiskomponenten `Tile`, `BigNumber`, `StaleBadge`, `WidgetErrorBoundary`.
- Widget-Registry mit Widgets `clock`, `date`, `timer`, `weather`, `stocks`, `crypto`, `notes` (Pro).
- 12×8-Rasterengine, Presets als Daten, Dashboard-Renderer aus JSON-Layout, zentraler 1-s-Tick.
- Fahrmodus: max. 6 große Kacheln, keine Animation/Scrollen/Eingaben, Long-Press/2-Finger-Exit, Wake Lock, Nachtabdunkelung, Anti-Burn-in-Shift, einmaliger Sicherheitshinweis.

### Phase 2 – Daten, Cache, Datenwidgets

- Provider-Adapter: Open-Meteo (Wetter + Geocoding), Finnhub (Aktien), CoinGecko (Krypto), Mocks.
- Daten-Gateway: geteilter Cache, Stale-While-Revalidate, Request-Coalescing, Circuit Breaker, Tageslimit-Kostenbremse; KV-Backends Upstash/Postgres/Memory.
- `POST /api/widgets/batch` (ein Request für alle Widgets, zod, Rate-Limit 60/min).
- Client-Polling mit Pause bei `document.hidden`, exponentiellem Backoff, ±10 % Jitter, Offline-Datenhaltung.
- Service Worker (App-Shell + Dashboard-Seite, Update-Reload nur im Leerlauf), Offline-Fallback-Seite, PWA-Manifest + Icons.

### Phase 3 – Auth, Konten, Editor, Geräte-Kopplung

- Supabase-Auth (Magic Link, PKCE-Callback) bzw. Dev-Login lokal; Profile/Subscriptions per Trigger.
- Migration mit RLS für alle Tabellen + RLS-Tests.
- Geräte-Kopplung: `/pair` (QR + Code, Polling), `/link` (Bestätigung/manuelle Eingabe), HttpOnly-Geräte-Token (nur Hash in DB), 90 Tage rollierend, Widerruf sofort, Heartbeat.
- Editor: Drag & Drop (dnd-kit, Maus + Touch), Resize-Handles ≥ 56 px, Größen-/Positions-Buttons, generische Config-Formulare, Autosave (800 ms) + Speichern, Undo/Redo (50 Schritte), Optimistic UI mit Rollback, mehrere Layouts (Pro), Fahrmodus-Layout.
- Onboarding (Preset, 3 Start-Widgets, Auto-Anleitung + Sicherheitsbestätigung).

### Phase 4 – Billing, Limits, Rechtliches

- Stripe Checkout (Subscription, Test-Modus), Customer Portal, Webhook mit Signaturprüfung und Idempotenz; Live-Keys werden ohne „GO LIVE“ abgelehnt.
- Serverseitige Free/Pro-Limits (Widgets, Layouts, Ticker, Geräte, Pro-Widgets); Downgrade ohne Datenverlust; 7 Tage Kulanz bei `past_due`.
- Widerrufs-Verzicht als ausdrückliche Zustimmung mit Zeitstempel (`consents`).
- Marketing-Seiten (Landing, Preise, FAQ) und Rechtsseiten mit `TODO_OWNER_LEGAL`-Platzhaltern.
- Konto-Export (JSON) und -Löschung (Stripe-Kunde wird beendet, Daten kaskadiert).
- Security-Header, CSP mit Nonce, CSRF-Origin-Check, Rate-Limits, PII-freie Logs, `/api/health`, k6-Lasttest-Skript.
