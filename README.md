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
```

## Produktion (Owner)

1. Supabase-Projekt (Region Frankfurt) anlegen, Migration `supabase/migrations/*.sql` anwenden
   (**nicht** `supabase/local/*` – das ist nur der lokale Stub).
2. Supabase Auth: Magic Link aktivieren, Site-URL + Redirect `https://<domain>/auth/callback` eintragen.
3. Vercel-Projekt (Region `fra1`), Env-Variablen laut `.env.example` setzen (`DATABASE_URL` = Pooler-URL, Transaction-Mode).
4. Upstash Redis (EU) für Cache/Rate-Limits → `KV_REST_API_URL`, `KV_REST_API_TOKEN`.
5. Stripe **Test-Modus**: Produkt „WitCar Pro“ mit Monats-/Jahrespreis, Webhook auf `/api/stripe/webhook`
   (Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`), Customer Portal aktivieren.
6. Datenanbieter nach Gate G2 (siehe DECISIONS D-007–D-009) konfigurieren.
7. Live-Schaltung erst nach „GO LIVE“ des Owners: `sk_live_…` + `WITCAR_STRIPE_LIVE=GO_LIVE`.
