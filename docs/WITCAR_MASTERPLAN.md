# WITCAR MASTERPLAN

> Zielleser: Claude Code (autonomer Coding-Agent). Kein Mensch liest dieses Dokument im Detail.
> Sprache: Prosa Deutsch, Code/Identifier/Commits/Kommentare Englisch.
> Owner: Zaikai (Solo-Dev, Deutschland, Kleinunternehmer §19 UStG).
> Stand: 2026-09-28. Version: 1.0

---

## 0. Arbeitsanweisungen an Claude Code (ZUERST LESEN)

### 0.1 Rolle
Du baust WitCar von null bis zum zahlenden MVP. Du arbeitest phasenweise (Abschnitt 19). Eine Phase ist erst fertig, wenn ALLE Acceptance Criteria erfüllt und automatisiert geprüft sind.

### 0.2 Regeln
1. **Ein Task = ein Commit-Block.** Kleine, reviewbare Commits (Conventional Commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`).
2. **Nie raten bei externen Fakten.** Preise, Free-Tier-Limits, Lizenzbedingungen und API-Schemas von Drittanbietern vor der Implementierung in der offiziellen Doku prüfen. Wenn unklar: in `DECISIONS.md` als "OPEN" eintragen und den sichersten Default wählen.
3. **Keine Secrets im Client oder im Repo.** Nur über Env-Variablen (Abschnitt 20). `.env.local` nie committen.
4. **Alle externen Datenquellen laufen serverseitig über Cache-Proxy.** Der Client ruft nie direkt Drittanbieter-APIs.
5. **Kein Tesla-IP.** Keine Tesla-Logos, -Schriften, -Fahrzeugbilder, kein "T"-Symbol. Siehe 2.2.
6. **Tests vor "fertig".** `pnpm typecheck && pnpm lint && pnpm test` muss grün sein, bevor ein Task als erledigt gilt.
7. **Leichtgewichtig.** Der Zielbrowser ist der Tesla-Browser auf teils schwacher Hardware. Siehe Abschnitt 17.
8. **Bei Konflikten gilt:** Sicherheit > Recht > Stabilität > Performance > Features > Optik.
9. **Nach jeder Phase:** `CHANGELOG.md` und `DECISIONS.md` aktualisieren, Abschnitt-19-Checkliste abhaken.
10. **Nichts Kostenpflichtiges auslösen** (Domains, Abos, Stripe Live-Modus) ohne Owner-Bestätigung. Stripe nur im Test-Modus, bis der Owner "GO LIVE" schreibt.

### 0.3 Definition of Done (global)
- Typecheck, Lint, Unit-Tests, E2E-Smoke grün
- Keine `any` ohne Kommentar
- Jede API-Route validiert Input (zod)
- Jede Tabelle hat RLS-Policies und einen Test dafür
- Lighthouse Performance ≥ 90 auf `/dashboard` (Mobile-Profil, gedrosselt)
- Doku aktualisiert

### 0.4 Sprache der UI
Standard Deutsch, i18n von Anfang an vorbereitet (`next-intl`), Englisch als zweite Sprache in Phase 5.

---

## 1. Produkt in einem Absatz

**WitCar** ist eine Web-App (PWA-fähig), die im Browser des Autos, insbesondere im Tesla-Browser, ein anpassbares Widget-Dashboard anzeigt: Uhrzeit, Wetter, Aktien/Krypto, Timer, Kalender-Termine, Notizen. Der Nutzer wählt sein Fahrzeugmodell (Layout-Preset), meldet sich über Geräte-Code/QR an, ordnet Widgets im Stand an und nutzt das Dashboard danach rein lesend als Monitor. Monetarisierung: Free-Tier mit wenigen Widgets, Pro-Abo mit kleiner monatlicher Gebühr über Stripe.

**Positionierung:** "Dein Überblick im Auto-Browser." Nie als Tesla-Produkt oder Tesla-Zubehör darstellen.

---

## 2. Rahmenbedingungen und harte Grenzen

### 2.1 Nutzungskontext
- Hauptnutzung laut Owner: **während der Fahrt als reiner Anzeige-Monitor**, Bedienung nur im Stand.
- Internet: Fahrzeug-WLAN via Handy-Hotspot oder Premium-Konnektivität.
- **UNGEKLÄRT (Validation Gate G0, siehe 3):** Ob der Tesla-Browser in Deutschland beim Fahren offen bleibt und Seiten weiter aktualisiert. Recherche-Stand 2026-09: Der Browser ist während der Fahrt "in vielen Regionen deaktiviert oder stark limitiert"; Video-Codecs werden in R/D blockiert. **Die Architektur muss deshalb auch ohne Fahrbetrieb tragfähig sein** (Laden, Parken, Beifahrer, andere Geräte).

### 2.2 Marken- und Designgrenzen (NON-NEGOTIABLE)
- Kein Tesla-Logo, kein "T", keine Fahrzeugsilhouetten oder -renderings, keine Tesla-Schrift (Gotham/proprietär).
- Schrift: `Inter` oder `Geist` (frei lizenziert, lokal gehostet, kein Google-Fonts-CDN wegen DSGVO).
- Farben: ähnlicher, aber eigener Look. Kein Tesla-Rot als Markenersatz. Akzentfarbe von WitCar: neutrales Cyan/Blau (Token `--accent`).
- "Tesla" darf nur **beschreibend** vorkommen ("läuft im Browser deines Fahrzeugs", "getestet mit Tesla-Fahrzeugen"). Nie im Produktnamen, Logo, Domainnamen oder als Modell-Icon.
- Pflichttext im Footer: "WitCar ist ein unabhängiges Produkt und steht in keiner Verbindung zu Tesla, Inc."
- Modellauswahl-UI: neutrale Bezeichnungen und abstrakte Bildschirm-Formen, keine Modellfotos.

### 2.3 Sicherheits-/Haftungsgrenzen
- Deutschland: § 23 StVO (Nutzung elektronischer Geräte beim Fahren). Blick aufs Display nur kurz und situationsangepasst. Kein Feature darf zu längerem Hinschauen einladen.
- **Drive Mode (siehe 14) ist Pflicht-Design:** wenige große Elemente, keine Animation, keine Eingabe, keine Ticker, kein Scrollen.
- Haftungshinweis beim ersten Start im Fahrmodus und in den AGB. Der Hinweis ersetzt keine sichere Gestaltung.
- **Kein Feature, das Bedienung während der Fahrt erfordert.** Falls ein Fahrzeugsignal (Geschwindigkeit) technisch verfügbar wäre: Konfiguration sperren. Im MVP wird kein Fahrzeugsignal genutzt; der Nutzer schaltet den Fahrmodus selbst.

### 2.4 Rechtsform
Solo-Gewerbe, Kleinunternehmer §19 UStG. Konsequenz: Rechnungen ohne ausgewiesene USt. Stripe-Tax-Konfiguration und Preisangaben entsprechend (Bruttopreis = Endpreis). Bei Überschreiten der Grenze oder Verkauf an Verbraucher im EU-Ausland (OSS/digitale Leistungen) muss der Owner steuerlich prüfen. Claude Code implementiert nur die technische Trennung, gibt keine Steuerberatung.

### 2.5 Non-Goals (MVP)
- Keine native App, kein App-Store-Release
- Keine Tesla Fleet API, keine Fahrzeugdaten (Phase 2 nach Validierung)
- Keine Videoinhalte, kein Streaming
- Kein Widget-Marktplatz, keine Drittanbieter-Widgets
- Keine Werbung
- Keine Steuerung von Fahrzeugfunktionen

---

## 3. Validation Gates (blockierende Prüfungen)

| Gate | Frage | Wer | Blockiert |
|---|---|---|---|
| G0 | Bleibt eine Webseite im Tesla-Browser beim Fahren offen und aktualisiert sie sich? | Owner + Bekannter mit Tesla, mit `/tools/drive-test` | Marketing-Aussage "beim Fahren nutzbar", Positionierung Fahrmodus |
| G1 | Exakte Viewport-Größen und Hintergrundfarbe pro Modell | Owner, mit `/tools/calibrate` | Model-Presets (final) |
| G2 | Lizenz-/Nutzungsbedingungen der Datenanbieter erlauben kommerzielle Nutzung | Claude Code (Doku) + Owner | Go-Live |
| G3 | Rechtstexte (Impressum, Datenschutz, AGB, Widerruf) vorhanden und geprüft | Owner | Go-Live |

**Claude Code baut in Phase 0 die Tools für G0 und G1** (Abschnitt 19). Bis G0 entschieden ist, wird der Fahrmodus als "experimentell" gekennzeichnet und nicht beworben.

**Auswertungslogik G0:**
- Seite bleibt beim Fahren sichtbar und Zähler läuft weiter → Fahrmodus offiziell unterstützt.
- Seite wird gesperrt/geschlossen → Fahrmodus bleibt als "Stand/Laden/Beifahrer"-Modus. Marketing umstellen auf Laden, Parken, Beifahrer.
- Seite bleibt sichtbar, aktualisiert sich aber nicht (Netz gedrosselt) → Offline-Fallback und Stale-Anzeige (Abschnitt 17) werden Pflicht.

---

## 4. Zielgruppe und Use Cases

**Primär:** Fahrer/Beifahrer eines Fahrzeugs mit Browser, die einen Überblick wollen (Zeit, Wetter, Kurse).
**Sekundär:** Ladepausen, Wartezeit, Beifahrer, Camper/Pendler.

Use Cases:
1. Im Stand: Layout einrichten (Widgets wählen, anordnen, Größe, Stadt, Ticker).
2. Im Betrieb: Dashboard läuft passiv, rein lesend.
3. Nach Netzverlust: letzte Daten bleiben sichtbar, klar als "veraltet" markiert.
4. Neues Gerät: Login per QR in unter 30 Sekunden.

---

## 5. Feature-Scope

### 5.1 MVP (Phasen 0–4)
- Widgets: `clock`, `date`, `weather`, `stocks`, `crypto`, `timer`, `notes` (read-only im Drive Mode), `calendar` (nur wenn Google-OAuth in Phase 4 machbar)
- Dashboard-Editor (Drag & Drop, Raster, nur im Edit Mode)
- Modell-Presets (Layout-Größen)
- Dark/Light/Auto
- Auth: Name (D-034; ursprünglich E-Mail-Magic-Link) + Geräte-Code/QR
- Abo: Free (3 Widgets) / Pro (alle Widgets, mehrere Layouts)
- Drive Mode
- PWA-Installierbarkeit + Offline-Fallback
- Rechtsseiten

### 5.2 Nach MVP (Phase 5+)
- Tesla Fleet API (Ladestand, Reichweite) nach G0 und Kostenprüfung
- Ladestationen, Verkehr, ÖPNV
- Weitere Fahrzeughersteller-Presets (generisch "Auto-Browser")
- Widget-Themes, Familien-/Team-Layouts
- Englisch und weitere Sprachen

---

## 6. Architektur

### 6.1 Stack (festgelegt)
- **Framework:** Next.js (App Router), TypeScript strict, React Server Components wo möglich
- **Styling:** Tailwind CSS, Design-Tokens als CSS-Variablen
- **UI-Bausteine:** eigene minimale Komponenten (kein schwerer UI-Kit), `lucide-react` für Icons
- **Drag & Drop:** `@dnd-kit/core` (Touch-tauglich, klein)
- **State:** Zustand oder React Context, kein Redux
- **Validation:** `zod`
- **DB/Auth:** Supabase (Postgres, Auth, RLS), Region EU (Frankfurt)
- **Payments:** Stripe (Checkout + Customer Portal + Webhooks)
- **Hosting:** Vercel, Region `fra1`
- **Cache:** Upstash Redis oder Vercel KV (Rate-Limit + API-Cache). Fallback: Postgres-Tabelle `api_cache`
- **Tests:** Vitest (Unit), Playwright (E2E), `@testing-library/react`
- **Tooling:** pnpm, ESLint, Prettier, Husky + lint-staged, GitHub Actions CI

Abweichungen vom Stack nur mit Eintrag in `DECISIONS.md` und Begründung.

### 6.2 Systemübersicht
```
[Tesla-Browser / beliebiger Browser]
        │  HTTPS
        ▼
[Next.js on Vercel] ── Auth ──► [Supabase Auth + Postgres (RLS)]
        │
        ├── /api/widgets/* ──► [Cache (Redis/KV)] ──► [Drittanbieter-APIs]
        ├── /api/device/*  ──► Geräte-Code-Flow
        └── /api/stripe/*  ──► [Stripe] (Webhook → subscriptions)
```

### 6.3 Repo-Struktur
```
witcar/
├─ CLAUDE.md                  # Kurzfassung für Claude Code (Abschnitt 24)
├─ DECISIONS.md               # ADR-Log
├─ CHANGELOG.md
├─ docs/
│  ├─ WITCAR_MASTERPLAN.md    # dieses Dokument
│  └─ incar-test-protocol.md
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/         # Landing, Preise, Rechtstexte
│  │  ├─ (app)/dashboard/     # Anzeige
│  │  ├─ (app)/editor/        # Bearbeiten
│  │  ├─ (app)/settings/
│  │  ├─ link/                # Geräte-Code-Eingabe (Handy)
│  │  ├─ tools/drive-test/    # G0
│  │  ├─ tools/calibrate/     # G1
│  │  └─ api/
│  ├─ widgets/
│  │  ├─ registry.ts
│  │  ├─ clock/ weather/ stocks/ crypto/ timer/ notes/ calendar/
│  │  └─ types.ts
│  ├─ lib/
│  │  ├─ providers/           # Datenanbieter-Adapter
│  │  ├─ cache/
│  │  ├─ auth/
│  │  ├─ billing/
│  │  ├─ presets/             # Modell-Presets
│  │  └─ env.ts               # zod-validierte Env
│  ├─ components/
│  ├─ styles/tokens.css
│  └─ i18n/
├─ supabase/
│  ├─ migrations/
│  └─ seed.sql
├─ tests/ (unit, e2e)
└─ .github/workflows/ci.yml
```

---

## 7. Datenmodell (Postgres, Supabase)

Alle Tabellen: `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`, RLS **an**.

```sql
-- profiles: 1:1 zu auth.users
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  locale text not null default 'de',
  theme text not null default 'auto' check (theme in ('auto','dark','light')),
  vehicle_preset text not null default 'generic-landscape',
  created_at timestamptz default now()
);

-- layouts: ein Nutzer kann mehrere haben (Free: 1, Pro: mehrere)
create table layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  preset text not null,
  mode text not null default 'standard' check (mode in ('standard','drive')),
  grid jsonb not null,            -- Array von {widgetId, type, x, y, w, h}
  is_default boolean not null default false,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- widget_configs: Konfiguration je Widget-Instanz
create table widget_configs (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid not null references layouts on delete cascade,
  widget_id text not null,        -- Instanz-ID im Layout
  type text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- devices: verknüpfte Auto-/Browser-Geräte
create table devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  label text,
  preset text,
  token_hash text not null,       -- SHA-256 des Geräte-Tokens
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz default now()
);

-- device_codes: kurzlebige Kopplungscodes (Auto zeigt Code/QR)
create table device_codes (
  id uuid primary key default gen_random_uuid(),
  device_code_hash text not null unique,
  user_code text not null unique,         -- 8 Zeichen, ohne 0/O/1/I
  user_id uuid references auth.users,     -- gesetzt, sobald Handy bestätigt
  status text not null default 'pending' check (status in ('pending','approved','expired','consumed')),
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- subscriptions: Spiegel des Stripe-Zustands
create table subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free' check (plan in ('free','pro')),
  status text not null default 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz default now()
);

-- api_cache (nur falls kein Redis/KV)
create table api_cache (
  key text primary key,
  value jsonb not null,
  expires_at timestamptz not null
);
```

**RLS-Regeln:**
- `profiles`, `layouts`, `widget_configs`, `devices`: Nutzer darf nur eigene Zeilen lesen/schreiben (`auth.uid() = user_id`, bei `widget_configs` über Join auf `layouts`).
- `subscriptions`: Nutzer nur lesen. Schreiben ausschließlich per Service-Role im Stripe-Webhook.
- `device_codes`: kein direkter Client-Zugriff, nur über API-Routen mit Service-Role.
- Free-Limit (3 Widgets, 1 Layout) wird **serverseitig** erzwungen (DB-Funktion oder API-Check), nicht nur in der UI.

---

## 8. Authentifizierung und Geräte-Kopplung

### 8.1 Ziel
Im Auto tippt niemand Passwörter. Login per Geräte-Code/QR, orientiert am OAuth Device Authorization Flow (RFC 8628).

### 8.2 Ablauf
1. Auto-Browser öffnet `/` → Button "Mit Handy anmelden".
2. Client ruft `POST /api/device/start`. Server erzeugt `device_code` (zufällig, 32 Byte, nur Hash gespeichert) und `user_code` (8 Zeichen, Alphabet ohne verwechselbare Zeichen). Gültigkeit 10 Minuten.
3. Auto zeigt **QR-Code** (URL `https://<domain>/link?code=<user_code>`) und den `user_code` als Text.
4. Handy scannt, öffnet `/link`, meldet sich an (Magic Link oder OAuth) und bestätigt: `POST /api/device/approve`.
5. Auto pollt `POST /api/device/poll` (Intervall 3 s, Backoff bei Fehlern). Bei `approved` liefert der Server ein **Geräte-Token** (langlebig, revocable), der Client speichert es in einem `HttpOnly`, `Secure`, `SameSite=Lax` Cookie.
6. Gerät erscheint in `devices` und ist unter Einstellungen widerrufbar.

### 8.3 Sicherheit
- Rate-Limit: `start` 10/h pro IP, `poll` 1 pro 2 s pro `device_code`, `approve` 10/h pro Nutzer.
- `user_code` einmalig verwendbar, nach Verbrauch `consumed`.
- Geräte-Token nur als SHA-256-Hash in der DB.
- Sitzung "dauerhaft" (Gerät-Session, 90 Tage rollierend). Widerruf sofort wirksam.
- Kein Klartext-Passwort im Auto. Handy-Login: Supabase Magic Link + optional Google OAuth.
- CSRF-Schutz auf allen mutierenden Routen (Origin-Check + SameSite).

### 8.4 Fallback ohne Handy-Kamera
`/link` kann `user_code` manuell aufnehmen (Groß-/Kleinschreibung ignorieren).

---

## 9. Widget-System

### 9.1 Vertrag (`src/widgets/types.ts`)
```ts
export type WidgetType =
  'clock'|'date'|'weather'|'stocks'|'crypto'|'timer'|'notes'|'calendar';

export interface WidgetDefinition<C extends z.ZodTypeAny = z.ZodTypeAny> {
  type: WidgetType;
  title: string;                       // i18n-Key
  minSize: { w: number; h: number };   // Rastereinheiten
  defaultSize: { w: number; h: number };
  configSchema: C;                     // zod
  defaultConfig: z.infer<C>;
  driveSafe: boolean;                  // im Drive Mode erlaubt?
  refreshMs: number | null;            // null = lokal, kein Netz
  proOnly: boolean;
  Component: React.ComponentType<WidgetProps<z.infer<C>>>;
  ConfigForm?: React.ComponentType<...>;
}
```
Neue Widgets werden **nur** durch Eintrag in `registry.ts` plus Ordner hinzugefügt. Keine Sonderfälle im Editor.

### 9.2 Widget-Katalog (MVP)

| Widget | Datenquelle | Refresh | driveSafe | Pro |
|---|---|---|---|---|
| clock | lokal (`Intl`) | 1 s (nur Sekunden optional) | ja | nein |
| date | lokal | 1 min | ja | nein |
| weather | Wetter-Provider via Proxy | 10–15 min | ja | nein |
| stocks | Aktien-Provider via Proxy, **verzögert** | 60–300 s | ja (max. 1 Ticker im Drive Mode) | ab 4. Ticker |
| crypto | Krypto-Provider via Proxy | 60–120 s | ja | ab 4. Coin |
| timer | lokal | 1 s | nur Anzeige, kein Start im Drive Mode | nein |
| notes | DB | beim Laden | nur Anzeige | ja |
| calendar | Google Calendar (OAuth, read-only) | 5 min | nur nächster Termin | ja |

### 9.3 Widget-Regeln
- Jedes Widget zeigt bei Fehler/Offline die **letzten bekannten Daten** plus Stale-Marker mit Zeitstempel ("vor 12 min").
- Kein Widget blockiert das Rendern anderer. Isolierte Error Boundaries pro Widget.
- Zahlen mit `tabular-nums`, Locale-korrekt formatiert.
- Kein Widget nutzt Animationen im Drive Mode.

---

## 10. Layout-Engine und Modell-Presets

### 10.1 Raster
- 12 Spalten × 8 Zeilen als Standardraster, skaliert per CSS Grid mit `fr`-Einheiten auf den Viewport.
- Zellen quadratisch genug für Touch: **Mindesthöhe eines Widgets ≥ 96 CSS-px.**
- Layout wird als `grid jsonb` gespeichert. Der Client rendert ohne Neuberechnung, keine zufällige Umordnung.

### 10.2 Presets
Presets sind **Daten**, keine Code-Verzweigungen (`src/lib/presets/`):
```ts
export interface VehiclePreset {
  id: string;                   // z.B. 'model-3-y', 'model-s-x', 'cybertruck', 'generic-landscape'
  label: string;               // neutral, kein Markenlogo
  aspect: number;              // Breite/Höhe
  refViewport: { w: number; h: number }; // gemessen in G1, bis dahin Schätzwert
  safeInsets: { top: number; right: number; bottom: number; left: number }; // Tesla-UI-Leisten
  gridCols: number; gridRows: number;
}
```
- **Startwerte sind Schätzungen und müssen in G1 gemessen werden.** Werte nicht als Fakten dokumentieren. Bis dahin gilt: Layout ist **viewport-responsiv**, Presets liefern nur Seitenverhältnis und Safe-Insets als Startpunkt.
- Vorschau im Editor: skaliertes Rechteck mit dem Preset-Seitenverhältnis.
- Fallback `generic-landscape` für alle anderen Geräte.

### 10.3 Editor
- Nur im **Edit Mode**. Wechsel per klarem Button, im Drive Mode gesperrt.
- Aktionen: Widget hinzufügen, verschieben, Größe ändern, konfigurieren, löschen, Layout duplizieren.
- Autosave (debounced 800 ms) plus expliziter "Speichern"-Button. Optimistic UI, Rollback bei Fehler.
- Undo/Redo (mindestens 20 Schritte).
- Touch-Targets ≥ 48×48 px, Drag-Handles ≥ 56 px.

---

## 11. Datenanbieter und Caching

### 11.1 Adapter-Prinzip
Jeder Anbieter hinter Interface `Provider<TIn, TOut>` in `src/lib/providers/`. Austausch ohne Änderung an Widgets. Einheitliches Format `{ data, fetchedAt, source, stale }`.

### 11.2 Kandidaten (VOR Nutzung Doku und Lizenz prüfen, Gate G2)
- **Wetter:** Open-Meteo (kein Key nötig). ACHTUNG: Die freie API ist laut Anbieter für **nicht-kommerzielle** Nutzung gedacht. WitCar ist kommerziell → kostenpflichtigen Plan oder Alternative (z. B. DWD Open Data für Deutschland, anderer Anbieter) prüfen. Entscheidung in `DECISIONS.md`.
- **Aktien:** Finnhub, Twelve Data, Alpha Vantage oder ähnlich. Prüfen: Free-Tier-Limit, **Redistribution/Display-Lizenz**, Verzögerung der Kurse, Börsen-Abdeckung (Xetra/US). Echtzeitdaten sind meist lizenzpflichtig → **im MVP verzögerte Kurse** mit Hinweis "Kurse verzögert, keine Anlageberatung".
- **Krypto:** CoinGecko (Bedingungen zu kommerzieller Nutzung und Attribution prüfen) oder Alternative.
- **Kalender:** Google Calendar API, OAuth read-only Scope. Verifizierungsanforderungen von Google beachten (Scope-Sensitivität).

### 11.3 Cache-Strategie
- Schlüssel: `provider:resource:params-hash`.
- TTL je Widget = mindestens `refreshMs` (zentraler Cache, ein Abruf bedient alle Nutzer mit identischen Parametern, z. B. Kurs AAPL).
- **Stale-While-Revalidate:** abgelaufene Daten sofort liefern, im Hintergrund erneuern.
- Request-Coalescing: parallele Anfragen auf denselben Schlüssel lösen nur einen Upstream-Call aus.
- Circuit Breaker pro Provider: bei Fehlerhäufung 60 s lang nur Cache ausliefern.
- Rate-Limit pro Nutzer/Gerät: 60 Widget-Requests/Minute.
- Kostenbremse: globales Tageslimit je Provider, bei Überschreitung nur Cache und Log-Warnung.

### 11.4 Client-Polling
- Ein zentraler `useDashboardData`-Hook bündelt Anfragen in **einem** Request (`POST /api/widgets/batch`) statt eines Requests pro Widget.
- Polling pausiert bei `document.hidden`. Exponentieller Backoff bei Fehlern (max. 5 min).
- Jitter (±10 %), damit nicht alle Geräte gleichzeitig anfragen.

---

## 12. Design-System

### 12.1 Tokens (`src/styles/tokens.css`)
```css
:root {
  --bg: #0f1114;            /* Platzhalter, in G1 mit Display abgleichen */
  --surface: #171a1e;
  --surface-2: #1f2328;
  --text: #f2f4f6;
  --text-dim: #9aa3ad;
  --accent: #38bdf8;
  --positive: #34d399;
  --negative: #f87171;
  --radius: 20px;
  --tap: 48px;
}
:root[data-theme="light"] { /* helle Variante, gleiche Semantik */ }
```
- Hintergrund-Ziel: **möglichst nah am Tesla-Display-Dunkel**, aber als eigener Token. Endwert nach Kalibrierung (`/tools/calibrate` zeigt Farbfelder zum Vergleich am echten Bildschirm).
- Kontrast mindestens WCAG AA, im Drive Mode AAA für Hauptzahlen.
- Schrift: Inter/Geist lokal, `font-variant-numeric: tabular-nums`, Fallback-Stack `system-ui`.
- Keine Schatten-/Blur-Effekte (Performance), flache Flächen mit dezenten Rändern.
- Kein Blau/Rot-Zwang zur Bedeutung allein: Kursänderungen zusätzlich mit Pfeil/Vorzeichen (Farbenblindheit).

### 12.2 Themes
`auto` (folgt `prefers-color-scheme`), `dark`, `light`. Standard **light** (weiß, D-035; ursprünglich dark). Kein Flackern beim Laden (Theme im `<html>` vor erstem Paint setzen).

### 12.3 Komponenten-Prinzipien
- Große Zahlen, wenig Text. Hauptwert im Drive Mode ≥ 64 CSS-px Höhe.
- Nur eine Information pro Kachel im Drive Mode.
- Keine Hover-Zustände als Funktionsträger (Touch-only).

---

## 13. Marketing-Site und Onboarding

- Seiten: `/` (Landing), `/pricing`, `/faq`, `/impressum`, `/datenschutz`, `/agb`, `/widerruf`, `/disclaimer`.
- Landing: Nutzenversprechen, Screenshot-Mockups **ohne Fahrzeugfotos**, Preis, "Kostenlos starten".
- Onboarding (max. 4 Schritte, Handy-first):
  1. Konto (nur Name, D-034; ursprünglich Magic Link)
  2. Modell/Preset wählen (neutrale Namen)
  3. 3 Start-Widgets wählen (Vorschlag: Uhr, Wetter, Aktie)
  4. QR-Code für das Auto
- Hinweis im Onboarding: "Handy-Hotspot muss aktiv sein" und Haftungs-/Sicherheitshinweis (einmalig bestätigen).
- Werbeaussagen zur Fahrnutzung erst nach Gate G0. Bis dahin Formulierung: "Ideal beim Laden und Parken. Fahrmodus experimentell."

---

## 14. Drive Mode (Spezifikation)

**Zweck:** Ein reduziertes, rein lesendes Layout für den Blick im Vorbeigehen.

Harte Regeln:
1. Maximal **6 Widgets**, empfohlen 4.
2. Nur Widgets mit `driveSafe: true`.
3. Keine Eingabefelder, keine Buttons außer "Beenden" (Long-Press oder 2-Finger-Tap, damit kein versehentliches Auslösen).
4. Kein Scrollen, keine Animationen, keine Ticker/Laufbänder, keine Blinkeffekte, keine Popups.
5. Aktualisierungen: Kurse/Wetter **ohne visuelles Springen** (Zahl ersetzen, keine Transition). Höchstens 1 sichtbare Änderung pro Widget pro Minute (außer Uhr).
6. Zeitanzeige 24 h, Sekunden standardmäßig aus.
7. Konfiguration nur im Edit Mode. Wechsel Edit → Drive nur im Edit Mode auslösbar, Drive-Layout ist vorab gespeichert.
8. Helligkeits-Modus: Nachtabdunkelung passend zur Tageszeit (Theme `auto` plus optional reduzierte Kontrastspitzen).
9. Bei Ausfall der Verbindung: stumm stale markieren, keine Fehlermeldungsdialoge.

Technik:
- Route `/dashboard?mode=drive` liefert ein separates, schlankes Rendering (kein Editor-Code im Bundle, dynamische Imports).
- Screen Wake Lock API verwenden, falls verfügbar (Fehler stumm ignorieren).
- Auto-Reload bei neuer App-Version (Service-Worker-Update), aber **nie** während der Nutzer interagiert.

---

## 15. Abo-Modell und Billing

### 15.1 Pläne (Hypothese, in Phase 4 mit Owner bestätigen)
| | Free | Pro |
|---|---|---|
| Preis | 0 € | ca. 2,99 €/Monat oder ca. 24,99 €/Jahr |
| Widgets | 3 | alle |
| Layouts | 1 | mehrere |
| Ticker/Coins | 3 | unbegrenzt (Fair Use, Obergrenze 20) |
| Geräte | 1 | 5 |
| Kalender/Notizen | nein | ja |

Preise sind **Konfiguration** (Stripe Price-IDs in Env), nie im Code hartkodiert.

### 15.2 Umsetzung
- Stripe Checkout (Subscription Mode), Customer Portal für Kündigung/Zahlungsmittel.
- Webhook `POST /api/stripe/webhook` mit Signaturprüfung. Verarbeitete Events: `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.payment_failed`.
- Idempotenz: Event-ID speichern, Doppelverarbeitung verhindern.
- Quelle der Wahrheit für Plan = `subscriptions`-Tabelle, gespiegelt aus Stripe. Client liest nur.
- Kulanzfrist bei Zahlungsproblemen: 7 Tage `past_due` bleibt Pro, danach Downgrade auf Free. **Downgrade löscht keine Daten**, sondern deaktiviert Überhang (ältestes Layout/Widgets bleiben, Rest read-only).
- Steuerliche Einstellungen: Kleinunternehmer, keine USt-Ausweisung. Technisch getrennt konfigurierbar, falls sich der Status ändert.
- Digitale Inhalte/Verbraucher: Widerrufsbelehrung und ausdrückliche Zustimmung zum Beginn der Leistung im Checkout-Flow (Checkbox + Speicherung des Zeitpunkts), Vorlage in `docs/legal-notes.md`. Rechtstexte final vom Owner/Anwalt.

---

## 16. Sicherheit, Datenschutz, Compliance

### 16.1 Sicherheit
- HTTPS erzwingen, HSTS, strikte CSP (kein Inline-Script außer nonce), `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal.
- Alle API-Inputs mit zod validieren. Ausgabe nie ungefiltert (Notizen: Text only, kein HTML).
- Rate-Limits (siehe 8.3 und 11.3). Bot-Schutz auf Auth-Endpunkten (z. B. Turnstile, datenschutzfreundlich prüfen).
- Secrets nur serverseitig, Service-Role-Key nie im Client.
- Abhängigkeiten: Dependabot, `pnpm audit` in CI.
- Logs ohne personenbezogene Daten (keine E-Mails, keine Notizinhalte).

### 16.2 Datenschutz (DSGVO)
- Datenminimierung: Speichern nur, was nötig ist (E-Mail, Layouts, Konfig, Abo-Status).
- Hosting in der EU (Supabase Frankfurt, Vercel `fra1`). Auftragsverarbeitungsverträge (AVV) mit Supabase, Vercel, Stripe, Cache-Anbieter abschließen (Owner-Aufgabe, Checkliste in `docs/legal-notes.md`).
- Keine Tracker, keine Google Fonts vom CDN, kein Analytics ohne Einwilligung. Falls Analytics: Plausible/Umami selbst gehostet oder cookielos.
- Betroffenenrechte: Export (`GET /api/account/export` → JSON) und Löschung (`DELETE /api/account`, kaskadiert, Stripe-Kunde anonymisieren/beenden).
- Datenschutzerklärung listet Empfänger (Supabase, Vercel, Stripe, gewählte Datenanbieter, ggf. Google).
- Standort (Wetter): nur Stadtname/Koordinaten vom Nutzer gewählt, keine automatische Standortabfrage im MVP.

### 16.3 Pflichttexte (Owner liefert/prüft final)
Impressum, Datenschutzerklärung, AGB, Widerrufsbelehrung, Haftungs-/Disclaimer ("Keine Anlageberatung", "Nicht für die Nutzung mit Ablenkung des Fahrers ausgelegt; Fahrer bleibt verantwortlich"), Marken-Disclaimer (2.2).

---

## 17. Performance und Zuverlässigkeit (Tesla-Browser-tauglich)

Annahmen: Chromium-basierter Browser, ältere Fahrzeuge mit schwächerer CPU, wechselhafte Hotspot-Verbindung.

- **Bundle-Budget:** Initial JS ≤ 150 kB gzip für `/dashboard`, Editor per dynamic import.
- Keine schweren Libs (kein Moment, keine Chart-Bibliothek im MVP, Sparklines als inline SVG).
- Rendering: möglichst statisch/SSR, Hydration schlank. Keine Layout-Thrashing-Timer, **ein** zentraler Tick statt viele `setInterval`.
- **Service Worker:** App-Shell und letzte Widget-Daten cachen → Dashboard startet auch bei Netzausfall mit Stale-Daten.
- **Stale-Anzeige:** jedes datenbasierte Widget zeigt dezent Alter der Daten ab > 2× Refresh-Intervall.
- **Auto-Recovery:** bei Verbindungsverlust Reconnect mit Backoff, kein manueller Reload nötig.
- Speicherlecks vermeiden (Timer/Listener aufräumen), Langzeittest 8 h ohne Reload (Playwright/Trace).
- Burn-in/Dauerlast: keine statischen Hochkontrast-Elemente an fixer Stelle im Drive Mode, subtiles Pixel-Shift (≤ 2 px alle 5 min) optional.
- Datensparsamkeit (Hotspot-Volumen): kompakte JSON-Antworten, Kompression (br/gzip), Batch-Endpoint. Ziel ≤ 5 MB/Stunde Dauerbetrieb.

---

## 18. Teststrategie

- **Unit (Vitest):** Provider-Adapter (mit gemockten Antworten), Cache (TTL, SWR, Coalescing), Preset-Logik, Limit-Erzwingung, Formatierung.
- **Komponenten:** Widgets in Zuständen `loading | ok | stale | error | empty`.
- **E2E (Playwright):** Onboarding, Geräte-Kopplung (zwei Browser-Kontexte simulieren Auto + Handy), Layout speichern/laden, Free-Limit, Checkout (Stripe Testmodus, Webhook-Mock), Drive Mode ohne Editor-Elemente.
- **RLS-Tests:** SQL-Tests, dass Nutzer A keine Daten von Nutzer B sieht.
- **Sicherheit:** Rate-Limit-Tests, Webhook-Signatur-Test, CSRF-Test.
- **Viewport-Matrix:** 1920×1200, 2200×1300, 2448×1080, 1280×800, 390×844 (Handy). Werte sind Test-Kandidaten, nach G1 aktualisieren.
- **In-Car-Protokoll** (`docs/incar-test-protocol.md`, von Claude Code zu erstellen): Schrittfolge für Owner/Bekannten mit Tesla: `/tools/drive-test` im Stand öffnen, losfahren (Beifahrer beobachtet), notieren: Seite bleibt sichtbar? Zähler läuft? Netz aktiv? Software-Version, Modell, Region, Fahrzeug-Baujahr. Ergebnisformular am Handy (Formular schreibt in Tabelle `incar_reports`).

---

## 19. Phasenplan mit Tasks und Acceptance Criteria

### Phase 0 — Fundament und Validierung
Tasks:
1. Repo, Next.js + TS strict, Tailwind, ESLint/Prettier, Husky, pnpm-Scripts (`dev`, `build`, `typecheck`, `lint`, `test`, `e2e`).
2. GitHub Actions CI (typecheck, lint, test, build).
3. Supabase-Projekt-Anbindung, `env.ts` mit zod, `.env.example`.
4. `CLAUDE.md`, `DECISIONS.md`, `CHANGELOG.md` anlegen (Inhalt aus 24).
5. **`/tools/drive-test`:** Vollbild-Seite mit Uhr, Sekundenzähler, Zufallszahl-Ticker (alle 5 s Fetch an `/api/tools/ping`, Anzeige der Latenz und Zeitstempel), `visibilitychange`-Log, `navigator.onLine`-Status, Anzeige `navigator.userAgent`, Viewport-Größe, `devicePixelRatio`, Formular "Ergebnis senden".
6. **`/tools/calibrate`:** Farbfelder zur Abstimmung des Hintergrunds am echten Display, Anzeige der Viewport-Maße, Testmuster für Safe-Insets.
7. `docs/incar-test-protocol.md`.
Acceptance:
- CI grün, Deployment auf Vercel Preview
- `/tools/drive-test` und `/tools/calibrate` laufen auf Desktop und Handy
- **Owner führt G0 und G1 durch**, Ergebnis wird in `DECISIONS.md` festgehalten (Claude Code trägt Platzhalter ein, Owner ergänzt)

### Phase 1 — Design-System und Widget-Kern
Tasks:
1. Tokens, Themes, Schrift lokal, Basiskomponenten (`Tile`, `BigNumber`, `StaleBadge`, `ErrorBoundary`).
2. Widget-Registry, Typen (Abschnitt 9), Widgets `clock`, `date`, `timer` (rein lokal).
3. Dashboard-Renderer aus JSON-Layout (statisch, noch ohne Editor), Presets als Daten (10.2).
4. Drive-Mode-Renderer (14) mit lokalem Widget-Set.
Acceptance:
- Dashboard rendert Layout aus Fixture in allen Viewports der Matrix
- Lighthouse ≥ 90, Initial JS ≤ 150 kB gzip
- Unit-/Komponententests für Widgets grün, keine Animation im Drive Mode (Test)

### Phase 2 — Daten, Cache und Datenwidgets
Tasks:
1. Provider-Interface, Adapter für Wetter, Aktien, Krypto (nach G2-Prüfung, Auswahl in `DECISIONS.md`).
2. Cache-Layer (Redis/KV oder `api_cache`), SWR, Coalescing, Circuit Breaker, Rate-Limit.
3. `POST /api/widgets/batch`, zod-Validierung, Fehlerformat.
4. Widgets `weather`, `stocks`, `crypto` inkl. Stale-Logik und Hinweis "verzögert, keine Anlageberatung".
5. Service Worker: App-Shell + letzte Daten (Offline-Start).
Acceptance:
- Provider-Ausfall (gemockt) → Dashboard zeigt Stale-Daten, keine Fehlerdialoge
- 100 parallele identische Anfragen erzeugen **1** Upstream-Call (Test)
- Tageslimit-Bremse greift (Test)
- Offline-Start zeigt letzte Daten (Playwright mit `context.setOffline`)

### Phase 3 — Auth, Konten, Editor, Geräte-Kopplung
Tasks:
1. Supabase Auth (Magic Link, optional Google), Profil-Erstellung per Trigger.
2. Migrationen und RLS gemäß Abschnitt 7, inklusive RLS-Tests.
3. Geräte-Kopplungsflow (Abschnitt 8) inklusive Seiten `/`-Login-Screen im Auto, `/link`, Geräteverwaltung.
4. Editor (Abschnitt 10.3) mit dnd-kit, Autosave, Undo/Redo, Config-Formulare.
5. Modellauswahl im Onboarding, Presets aus G1-Daten.
6. Layout-Persistenz, mehrere Layouts (Pro-Gate vorbereitet).
Acceptance:
- E2E: Nutzer meldet sich am Handy an, koppelt simuliertes Auto, sieht sein Layout dort
- Widerruf eines Geräts wirkt innerhalb von 30 s
- RLS-Test: Fremdzugriff scheitert für alle Tabellen
- Editor auf Touch bedienbar (Playwright Touch-Emulation), Targets ≥ 48 px

### Phase 4 — Billing, Limits, Rechtliches, Launch-Vorbereitung
Tasks:
1. Stripe (Test-Modus): Produkte/Preise als Config, Checkout, Portal, Webhooks, Idempotenz.
2. Serverseitige Limits (Free/Pro) plus UI-Hinweise (Upgrade-Prompts, nicht aufdringlich).
3. Downgrade-Verhalten ohne Datenverlust (15.2).
4. Marketing-Seiten, Preis, FAQ, Rechtsseiten (Platzhaltertexte klar markiert `TODO_OWNER_LEGAL`).
5. Kalender-Widget (Google OAuth read-only), falls Aufwand vertretbar, sonst Phase 5.
6. Konto-Export und -Löschung.
7. Monitoring: Fehler-Tracking (datenschutzkonform, EU), Uptime-Check, Provider-Kostenlogs.
8. Security-Header/CSP, Abhängigkeits-Audit, Lasttest Batch-Endpoint (k6 o. ä.).
Acceptance:
- Kompletter Testmodus-Kauf → Pro aktiv → Kündigung → Downgrade (E2E)
- Webhook-Replay verändert Zustand nicht doppelt
- Alle Pflichtseiten existieren (Inhalt vom Owner final)
- Gates G0–G3 dokumentiert; **kein Go-Live ohne G2 und G3**

### Phase 5 — Launch und Iteration
- Owner schreibt "GO LIVE" → Stripe Live-Keys, Domain, Produktions-Env.
- Beta mit kleiner Gruppe (Tesla-Foren/Communities, ehrliche Kommunikation der Einschränkungen).
- Feedback-Formular, Metriken (Aktivierungsrate, Widgets/Nutzer, Churn).
- Englisch, weitere Presets ("generic auto browser").
- Prüfung Fleet API (Kosten, Auth-Aufwand, Datenschutz) als eigenes Konzeptdokument, **nicht** ungefragt bauen.

---

## 20. Umgebungsvariablen (`.env.example`)

```
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=            # nur Server
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO_MONTHLY=
STRIPE_PRICE_PRO_YEARLY=
KV_REST_API_URL=
KV_REST_API_TOKEN=
WEATHER_API_KEY=                      # je nach Anbieter
STOCKS_API_KEY=
CRYPTO_API_KEY=
GOOGLE_CLIENT_ID=                     # Kalender, optional
GOOGLE_CLIENT_SECRET=
PROVIDER_DAILY_LIMIT_STOCKS=
PROVIDER_DAILY_LIMIT_WEATHER=
```
Alle Variablen in `src/lib/env.ts` zod-validiert; Build schlägt bei fehlenden Pflichtwerten fehl.

---

## 21. Risikoregister

| Risiko | Wahrscheinlichkeit | Wirkung | Gegenmaßnahme |
|---|---|---|---|
| Tesla-Browser sperrt Seiten beim Fahren | hoch/unklar | Kernversprechen bricht | Gate G0, Positionierung auf Laden/Parken, PWA auf anderen Geräten |
| Rechtliche Kritik zu Ablenkung (§ 23 StVO) | mittel | Reputation/Haftung | Drive-Mode-Regeln, Disclaimer, keine Bedienung, keine Werbung mit riskanter Nutzung |
| Datenlizenz verbietet kommerzielle Nutzung | mittel | Kosten/Abschaltung | Gate G2, Adapter-Prinzip, Anbieterwechsel möglich |
| Tesla baut eigene Widgets/schränkt Browser weiter ein | mittel | Marktverlust | Geräteunabhängigkeit, Nischenfeatures, Multi-Hersteller |
| Markenrechtliche Abmahnung | niedrig | Aufwand/Kosten | Strikte Regeln 2.2, nur beschreibende Nennung |
| API-Kosten skalieren | mittel | Marge | Zentraler Cache, Tageslimits, Preisgestaltung Pro |
| Schwache Fahrzeug-Hardware | mittel | Ruckeln | Bundle-Budget, keine Effekte, Langzeittests |
| Hotspot-Abbrüche | hoch | Leere Widgets | Offline-Cache, Stale-Anzeige, Auto-Reconnect |
| Kleinunternehmergrenze/Steuer | niedrig-mittel | Steuerthema | Owner klärt mit Steuerberater, Billing technisch flexibel |
| Solo-Bus-Faktor | hoch | Verzögerung | Scope klein halten, Automatisierung, gute Doku |

---

## 22. Offene Fragen an den Owner (Claude Code stellt sie gebündelt, nicht einzeln)

1. G0/G1-Ergebnisse (wenn Test erfolgt).
2. Domainname und Verfügbarkeit (`witcar.*`), Kosten freigeben.
3. Endpreis Pro (2,99 €? 3,99 €?), Jahresrabatt ja/nein.
4. Kalender-Widget im MVP oder später?
5. Rechtstexte: eigener Generator/Anwalt? (Owner liefert bis Phase 4.)
6. Analytics gewünscht (cookielos) oder komplett darauf verzichten?
7. Markenanmeldung "WitCar" (DPMA-Recherche, Kollisionsprüfung) vor Go-Live?

---

## 23. Entscheidungslog (Startzustand für `DECISIONS.md`)

| ID | Entscheidung | Status |
|---|---|---|
| D-001 | Web/PWA statt nativer App | FINAL |
| D-002 | Next.js + Supabase + Stripe + Vercel | FINAL |
| D-003 | Geräte-Kopplung per QR/Device Code | FINAL |
| D-004 | Aktien nur verzögert im MVP | FINAL |
| D-005 | Keine Fahrzeugdaten im MVP | FINAL |
| D-006 | Fahrmodus "experimentell", bis G0 entschieden | FINAL |
| D-007 | Wetteranbieter | OPEN (G2) |
| D-008 | Aktienanbieter | OPEN (G2) |
| D-009 | Krypto-Anbieter | OPEN (G2) |
| D-010 | Cache: Redis/KV vs. Postgres | OPEN |
| D-011 | Modell-Presets (Maße) | OPEN (G1) |
| D-012 | Preisgestaltung Pro | OPEN |

---

## 24. Anhang: `CLAUDE.md` (in Repo-Root kopieren)

```md
# WitCar — Agent Guide

Product: widget dashboard for car browsers (Tesla browser primarily), subscription via Stripe.
Master plan: docs/WITCAR_MASTERPLAN.md (source of truth). Decisions: DECISIONS.md.

## Commands
- pnpm dev | build | typecheck | lint | test | e2e
- Before marking any task done: pnpm typecheck && pnpm lint && pnpm test

## Hard rules
- No Tesla logos/fonts/vehicle imagery/"T" mark. "Tesla" only descriptively.
- Client never calls third-party data APIs. Everything via server cache proxy.
- No secrets in client or repo. Env via src/lib/env.ts (zod).
- Every API route validates input with zod. Every table has RLS + a test.
- Drive mode: read-only, no animation, no scrolling, max 6 widgets, driveSafe widgets only.
- Free/Pro limits enforced server-side.
- Stripe test mode only until owner says GO LIVE.
- Verify third-party terms/limits in official docs before implementing; log in DECISIONS.md.
- Bundle budget: /dashboard initial JS <= 150 kB gzip.

## Workflow
Work phase by phase (masterplan section 19). Small commits (Conventional Commits).
Update CHANGELOG.md and DECISIONS.md after each phase. Ask owner questions in one batch.
```

---

## 25. Start-Prompt für Claude Code (erste Sitzung)

```
Lies docs/WITCAR_MASTERPLAN.md vollständig. Beginne mit Phase 0.
Lege zuerst CLAUDE.md, DECISIONS.md, CHANGELOG.md aus Abschnitt 24/23 an,
dann führe die Tasks 1–7 der Phase 0 der Reihe nach aus.
Halte dich an alle Regeln aus Abschnitt 0. Melde am Ende: erledigte Tasks,
Teststatus, offene Punkte für den Owner (gebündelt).
```
