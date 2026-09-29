#!/usr/bin/env bash
# Pushes the two Supabase secrets from .env.local to Vercel (production) and
# deploys https://witcar.vercel.app. Secrets are piped, never printed.
# Usage: pnpm deploy:vercel
set -euo pipefail
cd "$(dirname "$0")/.."

vc() { npx --yes vercel@61 "$@"; }
val() { grep -E "^$1=" .env.local | head -1 | cut -d= -f2-; }

for key in DATABASE_URL SUPABASE_SERVICE_ROLE_KEY; do
  if [ -z "$(val "$key")" ]; then
    echo "$key fehlt in .env.local – siehe README, Abschnitt Supabase."
    exit 1
  fi
done
case "$(val DATABASE_URL)" in
  *YOUR-PASSWORD*) echo "DATABASE_URL enthält noch [YOUR-PASSWORD] – bitte das echte Passwort einsetzen."; exit 1 ;;
esac

echo "Übertrage Geheimnisse nach Vercel (production) …"
for key in DATABASE_URL SUPABASE_SERVICE_ROLE_KEY; do
  printf '%s' "$(val "$key")" | vc env add "$key" production --force >/dev/null 2>&1
  echo "  ✓ $key"
done

echo "Deploye nach Vercel (Region fra1) …"
vc deploy --prod --yes >/dev/null
for _ in $(seq 1 30); do
  if curl -sf https://witcar.vercel.app/api/health >/dev/null; then
    echo "✓ Online: https://witcar.vercel.app"
    exit 0
  fi
  sleep 3
done
echo "Deployment fertig, aber /api/health antwortet nicht – Logs: npx vercel@61 logs"
exit 1
