# WitCar

Anpassbares Widget-Dashboard für den Browser im Auto (PWA). Next.js 16 · Supabase · Stripe · Vercel.
Masterplan: [docs/WITCAR_MASTERPLAN.md](docs/WITCAR_MASTERPLAN.md) · Entscheidungen: [DECISIONS.md](DECISIONS.md) · Änderungen: [CHANGELOG.md](CHANGELOG.md)

> WitCar ist ein unabhängiges Produkt und steht in keiner Verbindung zu Tesla, Inc.

## Schnellstart (lokal, ohne externe Dienste)

```bash
pnpm install
pnpm dev            # http://localhost:3000 – PGlite + Dev-Login + Mock-Daten (siehe .env.local)
```

- Anmelden: `/login` → beliebige E-Mail → „Anmelden (lokal)“
- Auto simulieren: zweites Browserfenster (privat) → `/pair`, Code am „Handy“ unter `/link` eingeben
- Demo ohne Konto: `/demo` · Werkzeuge: `/tools/drive-test`, `/tools/calibrate`

## Im echten Auto testen (ohne Hosting-Konto)

```bash
pnpm tesla   # baut die App und macht sie über einen Cloudflare-Tunnel öffentlich erreichbar
```

Im Tesla-Browser die angezeigte Adresse mit `/test` öffnen. Details: [docs/incar-test-protocol.md](docs/incar-test-protocol.md).

## Qualität

```bash
pnpm typecheck && pnpm lint && pnpm test   # vor jedem "fertig"
pnpm e2e:install                           # einmalig: Chromium für Playwright
pnpm e2e                                   # Build + Start auf :3100 + E2E
pnpm licenses:gen                          # nach jeder Änderung an Abhängigkeiten (CI prüft mit licenses:check)
```

## Supabase (Projekt „WitCar“, Frankfurt)

Das Projekt ist angelegt (`smyejbxtbivqvztpvnye`, eu-central-1, Free-Plan), beide Migrationen aus
`supabase/migrations/` sind eingespielt, RLS ist aktiv. URL und Publishable Key stehen bereits in `.env.local`.
Einmalig im [Dashboard](https://supabase.com/dashboard/project/smyejbxtbivqvztpvnye) erledigen:

1. **Datenbank-Passwort**: Project Settings → Database → _Reset database password_ (neues Passwort notieren).
2. **DATABASE_URL**: oben _Connect_ → _Transaction pooler_ → URI kopieren, `[YOUR-PASSWORD]` ersetzen,
   in `.env.local` bei `DATABASE_URL=` eintragen.
3. **Secret Key**: Project Settings → API Keys → _Secret keys_ → Key (`sb_secret_…`) in `.env.local` bei
   `SUPABASE_SERVICE_ROLE_KEY=` eintragen.
4. **Login-Weiterleitungen**: Authentication → URL Configuration
   - Site URL: `http://localhost:3000` (später die echte Domain)
   - Redirect URLs: `http://localhost:3000/**` und `https://*.trycloudflare.com/**`

Danach nutzt `pnpm dev` bzw. `pnpm tesla` automatisch Supabase (Magic-Link-Login per E-Mail).
Hinweis: Der eingebaute Supabase-Mailversand schickt nur an Mitglieder des Supabase-Teams (also deine eigene
Adresse) und ist nicht für den Produktivbetrieb gedacht → vor dem Launch eigenes SMTP einrichten.

## Website: https://witcar.vercel.app

Gehostet bei Vercel (Projekt `witcar`, Hobby-Plan, Funktionen in Frankfurt `fra1`). Öffentliche Werte und die
Datenanbieter sind dort bereits als Umgebungsvariablen gesetzt. Nach dem Eintragen der zwei Supabase-Geheimnisse
in `.env.local` (Abschnitt Supabase):

```bash
pnpm deploy:vercel   # überträgt DATABASE_URL + Secret Key nach Vercel und veröffentlicht die Seite
```

In Supabase unter Authentication → URL Configuration zusätzlich eintragen: Site URL `https://witcar.vercel.app`,
Redirect URL `https://witcar.vercel.app/**`.
Hinweis: Der Hobby-Plan ist laut Vercel nur für private, nicht-kommerzielle Nutzung. Für den Verkaufsstart entweder
Vercel Pro oder – günstiger – ein eigener Server: [docs/deploy-hetzner.md](docs/deploy-hetzner.md) (Hetzner + Coolify,
`Dockerfile` im Repo).

## Datenquellen (kostenlos, kommerziell erlaubt)

| Widget       | Anbieter                       | Schlüssel                   | Lizenz / Hinweis                                |
| ------------ | ------------------------------ | --------------------------- | ----------------------------------------------- |
| Wetter       | MET Norway                     | keiner (`PROVIDER_CONTACT`) | CC BY 4.0, User-Agent mit Kontakt, 30 min Cache |
| Ortssuche    | Nominatim (OpenStreetMap)      | keiner                      | ODbL, max. 1 Anfrage/s, 7 Tage Cache            |
| Krypto       | CoinMarketCap Basic            | `CMC_API_KEY` (gratis)      | 15.000 Credits/Monat → Top 250, 10 min Cache    |
| Wechselkurse | EZB-Referenzkurse              | keiner                      | Quelle nennen, täglich aktualisiert             |
| Aktien       | – (aus, `STOCKS_PROVIDER=off`) | –                           | keine kostenlose kommerzielle Quelle (D-008)    |

Lokal/CI laufen alle Widgets mit Mock-Daten („Demo-Daten“). Quellenangaben erscheinen automatisch auf `/lizenzen`.

## Produktion (Owner)

1. ~~Supabase-Projekt anlegen, Migrationen anwenden~~ (erledigt, siehe oben; **nie** `supabase/local/*` anwenden – das ist nur der lokale Stub).
2. Supabase Auth: Site-URL + Redirect `https://<domain>/auth/callback` auf die echte Domain umstellen, eigenes SMTP.
3. Hosting: Hetzner + Coolify ([Anleitung](docs/deploy-hetzner.md)) oder Vercel Pro (Region `fra1`); Env-Variablen laut
   `.env.example` setzen (`DATABASE_URL` = Pooler-URL, Transaction-Mode). Cache/Rate-Limits laufen über Postgres.
4. Kostenlosen CoinMarketCap-Key holen (`CMC_API_KEY`) und `PROVIDER_CONTACT` (Kontakt-E-Mail) setzen.
5. Stripe **Test-Modus**: Produkt „WitCar Pro“ mit Monats-/Jahrespreis, Webhook auf `/api/stripe/webhook`
   (Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`), Customer Portal aktivieren.
6. Datenanbieter: Standard sind die kostenlosen Quellen oben (DECISIONS D-007–D-009, D-031); Aktien nur mit lizenziertem Anbieter.
7. Live-Schaltung erst nach „GO LIVE“ des Owners: `sk_live_…` + `WITCAR_STRIPE_LIVE=GO_LIVE`.
