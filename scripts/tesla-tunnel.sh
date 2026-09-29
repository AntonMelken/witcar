#!/usr/bin/env bash
# In-car test (gates G0/G1) without any hosting account:
# builds the app for a public Cloudflare quick-tunnel URL and serves it from this Mac.
# The Mac must stay online and awake while testing (caffeinate keeps it awake).
# Usage: pnpm tesla        (Ctrl+C stops server and tunnel)
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3000}"
command -v cloudflared >/dev/null || { echo "cloudflared fehlt: brew install cloudflared"; exit 1; }

LOG="$(mktemp -t witcar-tunnel)"
cloudflared tunnel --no-autoupdate --url "http://localhost:${PORT}" >"$LOG" 2>&1 &
TUNNEL_PID=$!
SERVER_PID=""
cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
  kill "$TUNNEL_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starte Cloudflare-Tunnel …"
URL=""
for _ in $(seq 1 60); do
  URL="$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG" | head -1 || true)"
  [ -n "$URL" ] && break
  sleep 1
done
[ -n "$URL" ] || { echo "Tunnel-URL nicht erhalten:"; cat "$LOG"; exit 1; }

export NEXT_PUBLIC_SITE_URL="$URL"
# Personal, non-commercial test: real weather/crypto from the free APIs, stocks as demo data.
export WEATHER_PROVIDER="${WEATHER_PROVIDER:-open-meteo}" CRYPTO_PROVIDER="${CRYPTO_PROVIDER:-coingecko}" STOCKS_PROVIDER=mock

if grep -Eq '^DATABASE_URL=.+' .env.local 2>/dev/null && grep -Eq '^SUPABASE_SERVICE_ROLE_KEY=.+' .env.local 2>/dev/null; then
  # Supabase configured in .env.local: real database + magic-link login.
  # Needs "https://*.trycloudflare.com/**" in Supabase Auth -> URL Configuration -> Redirect URLs.
  echo "Backend: Supabase (aus .env.local)"
else
  # Local backend (persistent PGlite in .pglite-tesla), dev login, test mode only.
  echo "Backend: lokal (PGlite + Dev-Login)"
  export WITCAR_DB=pglite PGLITE_DATA_DIR=.pglite-tesla
  export WITCAR_AUTH=dev WITCAR_ALLOW_DEV_BACKEND=1
  export WITCAR_SESSION_SECRET="$(openssl rand -hex 32)"
fi

echo "Baue die App für ${URL} …"
pnpm -s build >/dev/null
# Start Next directly so Ctrl+C really stops it (pnpm would detach the server).
node node_modules/next/dist/bin/next start -p "$PORT" >/dev/null 2>&1 &
SERVER_PID=$!
caffeinate -dimsu -w "$SERVER_PID" &
for _ in $(seq 1 60); do curl -sf "http://localhost:${PORT}/api/health" >/dev/null && break; sleep 1; done
for _ in $(seq 1 30); do curl -sf "${URL}/api/health" >/dev/null && break; sleep 2; done

HOST="${URL#https://}"
echo
echo "================================================================"
echo " WitCar ist öffentlich erreichbar (solange dieses Fenster läuft):"
echo
echo "   Im Tesla-Browser eintippen:  ${HOST}/test"
echo
echo " Handy: QR-Code scannen (öffnet dieselbe Adresse)"
node -e "require('qrcode').toString(process.argv[1] + '/test', { type: 'terminal', small: true }).then(console.log)" "$URL"
echo " Beenden: Ctrl+C"
echo "================================================================"
wait "$SERVER_PID"
