#!/usr/bin/env bash
# Teste ponta a ponta com um "Supabase local" montado à mão: PostgreSQL local,
# Supabase Auth (GoTrue) e PostgREST, mais um gateway que junta os dois numa
# URL só. Roda o fluxo completo no Chromium (Playwright) e salva as telas em
# telas-e2e/. Precisa de: PostgreSQL 16 local (psql/createdb como superusuário),
# Node, curl e Playwright com Chromium. Uso: npm run test:e2e
set -euo pipefail
cd "$(dirname "$0")"
RAIZ="$(cd ../.. && pwd)"
BIN="$PWD/.bin"
mkdir -p "$BIN"
SEGREDO='segredo-de-teste-com-mais-de-32-caracteres-ok'
PSQL_ADMIN=${PSQL_ADMIN:-"psql -q -v ON_ERROR_STOP=1"}

[ -x "$BIN/postgrest" ] || curl -sSL https://github.com/PostgREST/postgrest/releases/download/v12.2.3/postgrest-v12.2.3-linux-static-x64.tar.xz | tar xJ -C "$BIN"
[ -x "$BIN/auth" ] || curl -sSL https://github.com/supabase/auth/releases/download/v2.177.0/auth-v2.177.0-x86.tar.gz | tar xz -C "$BIN"

dropdb --if-exists e2e; createdb e2e
$PSQL_ADMIN -d e2e -f setup.sql

PIDS=()
trap 'kill ${PIDS[@]} 2>/dev/null || true' EXIT

GOTRUE_DB_DRIVER=postgres \
DATABASE_URL='postgres://supabase_auth_admin:senha@localhost:5432/e2e?search_path=auth&sslmode=disable' \
GOTRUE_SITE_URL=http://localhost:8081 GOTRUE_URI_ALLOW_LIST='http://localhost:8081/**' \
GOTRUE_JWT_SECRET=$SEGREDO GOTRUE_JWT_EXP=3600 GOTRUE_JWT_AUD=authenticated GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated GOTRUE_JWT_ADMIN_ROLES=service_role \
GOTRUE_MAILER_AUTOCONFIRM=true GOTRUE_API_HOST=127.0.0.1 PORT=9999 API_EXTERNAL_URL=http://localhost:8000/auth/v1 \
GOTRUE_EXTERNAL_EMAIL_ENABLED=true GOTRUE_LOG_LEVEL=warn GOTRUE_DB_MIGRATIONS_PATH="$BIN/migrations" \
  "$BIN/auth" > "$BIN/auth.log" 2>&1 &
PIDS+=($!)
for _ in $(seq 30); do curl -sf localhost:9999/health > /dev/null && break; sleep 1; done

for f in "$RAIZ"/supabase/migrations/*.sql; do $PSQL_ADMIN -d e2e -f "$f"; done

cat > "$BIN/pgrst.conf" <<CONF
db-uri = "postgres://authenticator:senha@localhost:5432/e2e"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$SEGREDO"
server-port = 3000
CONF
"$BIN/postgrest" "$BIN/pgrst.conf" > "$BIN/pgrst.log" 2>&1 &
PIDS+=($!)
node gateway.js & PIDS+=($!)

ANON=$(SEGREDO=$SEGREDO node -e '
const c=require("crypto");const b=o=>Buffer.from(JSON.stringify(o)).toString("base64url");
const h=b({alg:"HS256",typ:"JWT"}),p=b({role:"anon",iss:"supabase",iat:1700000000,exp:2000000000});
console.log(h+"."+p+"."+c.createHmac("sha256",process.env.SEGREDO).update(h+"."+p).digest("base64url"))')

(cd "$RAIZ" && EXPO_PUBLIC_SUPABASE_URL=http://localhost:8000 EXPO_PUBLIC_SUPABASE_ANON_KEY=$ANON \
  EXPO_PUBLIC_APP_URL=http://localhost:8081 CI=1 npx expo export --platform web --output-dir "$BIN/dist" > /dev/null)
node static.js "$BIN/dist" & PIDS+=($!)
sleep 2
node fluxo.js "$RAIZ/telas-e2e"
