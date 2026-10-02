#!/usr/bin/env bash
# Cria um banco PostgreSQL temporário, aplica as migrações e roda os testes
# de regras de acesso. Precisa de um PostgreSQL local (psql) e de um usuário
# com permissão para criar bancos. Uso: npm run test:db
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${DB_TESTE:-app_academia_teste}"
PSQL=(psql -v ON_ERROR_STOP=1 -q -X)
dropdb --if-exists "$DB" 2>/dev/null || true
createdb "$DB"
"${PSQL[@]}" -d "$DB" -f supabase/tests/supabase_simulado.sql
for f in supabase/migrations/*.sql; do
  "${PSQL[@]}" -d "$DB" -f "$f"
done
"${PSQL[@]}" -o /dev/null -d "$DB" -f supabase/tests/regras_de_acesso.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  //'
dropdb "$DB"
