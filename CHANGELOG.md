# Changelog

## [Unreleased]

### Fixed

- Login: Der Anmeldelink funktioniert jetzt in jedem Browser (Mail-App, anderes Gerät). Bisher brauchte der PKCE-Link das Cookie aus dem Browser, der ihn angefordert hat → „Anmeldelink ungültig oder abgelaufen“.

### Added

- „Sofort starten“ im Auto (`/api/device/quick-start`): ein Tipp, kein E-Mail, kein Handy. Legt ein Auto-Konto ohne E-Mail an, mit Start-Dashboard (Uhr, Wetter, Aktien), und meldet das Auto per Gerätetoken an. Auf `/login` im Tesla-Browser und auf `/pair` ganz oben.
- Login per 6-stelligem E-Mail-Code (`/api/auth/verify-code`): Code im Auto eintippen, Mail am Handy lesen.
- Tesla-Browser: `/login` zeigt direkt den QR-Code zum Koppeln, E-Mail-Code als Alternative.
- Eigene deutsche E-Mail-Vorlagen mit Code und Link (`supabase/templates/`).
- Eigene Fehlermeldung bei Rate-Limit (429) statt „Adresse prüfen“.

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
