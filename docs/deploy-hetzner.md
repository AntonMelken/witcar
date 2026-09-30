# WitCar auf einem eigenen Server (Hetzner + Coolify)

Günstige Alternative zu Vercel Pro (D-028): ein kleiner Server bei Hetzner (deutsche Firma, Rechenzentren in
Deutschland/Finnland) mit [Coolify](https://coolify.io) (Open Source, Apache-2.0) als Deploy-Oberfläche. Coolify baut
das Repo mit dem `Dockerfile` bei jedem Push, holt HTTPS-Zertifikate (Let's Encrypt) und startet den Container neu.

Kosten: nur der Server (kleinste x86-Instanz mit 2 vCPU/4 GB reicht; aktuellen Preis bei Hetzner prüfen). Datenbank und
Login bleiben bei Supabase (Free-Plan, kommerziell erlaubt).

## 1. Server anlegen (einmalig)

1. Konto bei [Hetzner Cloud](https://console.hetzner.cloud) anlegen.
2. Neues Projekt → Server hinzufügen: Standort **Nürnberg** oder **Falkenstein**, Image **Ubuntu 24.04**, kleinste
   x86-Instanz (Coolify empfiehlt mind. 2 vCPU/2 GB RAM), eigenen SSH-Key hinterlegen.
3. Auftragsverarbeitungsvertrag (AVV) in der Hetzner Console abschließen (Konto → AVV).

## 2. Coolify installieren

Per SSH auf den Server (`ssh root@<server-ip>`), dann:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Danach `http://<server-ip>:8000` öffnen, Admin-Konto anlegen. Sobald die eigene Domain eingerichtet ist, das
Coolify-Dashboard ebenfalls hinter HTTPS legen (Settings → Instance Domain).

## 3. Domain

Beim Domain-Anbieter einen A-Record `witcar.<deine-domain>` → `<server-ip>` setzen.

## 4. App in Coolify anlegen

1. Projects → New → **Application** → GitHub-Repo `AntonMelken/witcar` verbinden (GitHub App), Branch `main`.
2. Build Pack: **Dockerfile** (liegt im Repo-Root). Port: **3000**. Domain: `https://witcar.<deine-domain>`.
3. Environment Variables (Werte wie in `.env.example`):
   - **Als Build-Variable markieren** (landen im Browser-Code, sind öffentlich): `NEXT_PUBLIC_SITE_URL`,
     `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - **Nur Laufzeit** (geheim, _nicht_ als Build-Variable): `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
     `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`,
     `CMC_API_KEY`, `PROVIDER_CONTACT` (deine Kontakt-E-Mail für MET Norway/Nominatim).
   - Optional, falls angeboten: „Include Source Commit in Build“ aktivieren (Coolify übergibt dann `SOURCE_COMMIT`)
     → Build-ID im Healthcheck.
4. Health Check: Pfad `/api/health`, Port 3000 (das Image hat zusätzlich einen eigenen Docker-Healthcheck).
5. Deploy. Ab jetzt baut Coolify bei jedem Push auf `main` automatisch (Webhook der GitHub App).

Hinweis: Das Image prüft die Umgebung erst beim Start. Fehlt ein Pflichtwert, antwortet `/api/health` mit 503 und die
Logs in Coolify nennen den fehlenden Wert.

## 5. Dienste auf die neue Domain umstellen

- **Supabase** → Authentication → URL Configuration: Site URL `https://witcar.<deine-domain>`, Redirect URL
  `https://witcar.<deine-domain>/**`.
- **E-Mail für Login-Links**: Supabase → Authentication → SMTP Settings → eigenes SMTP, z. B. Brevo (Free-Plan,
  300 Mails/Tag): Host `smtp-relay.brevo.com`, Port `587`, Zugangsdaten aus Brevo → SMTP & API. Absender-Domain in Brevo
  verifizieren (SPF/DKIM-Einträge beim Domain-Anbieter).
- **Stripe** → Webhook-Endpunkt auf `https://witcar.<deine-domain>/api/stripe/webhook` ändern, neues Signing-Secret als
  `STRIPE_WEBHOOK_SECRET` eintragen.
- **Rechtstexte**: In der Datenschutzerklärung Vercel durch Hetzner (Hosting, Deutschland) ersetzen und Brevo als
  Auftragsverarbeiter (E-Mail-Versand) ergänzen; AVV mit Brevo abschließen.

## 6. Backups

Der Supabase-Free-Plan macht keine automatischen Backups. Einfachste Lösung auf dem Server: ein nächtlicher Cron-Job,
der mit `pg_dump` (Session-Pooler-URL aus Supabase → Connect) eine verschlüsselte Sicherung schreibt, z. B. in eine
Hetzner Storage Box. Alternativ Supabase Pro (tägliche Backups inklusive).

## Lokal testen (ohne Docker)

```bash
NEXT_OUTPUT=standalone WITCAR_ENV_CHECK=off NEXT_PUBLIC_SITE_URL=http://localhost:3000 pnpm build
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
cd .next/standalone && WITCAR_DB=pglite WITCAR_ALLOW_DEV_BACKEND=1 \
  WITCAR_SESSION_SECRET=local-standalone-secret-0123456789abcdef node server.js
```
