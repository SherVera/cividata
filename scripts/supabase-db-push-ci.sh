#!/usr/bin/env bash
# Verifica la Database password y aplica migraciones en CI (pooler → directo).
set -euo pipefail

label="${1:-remote}"

if [[ -z "${SUPABASE_DB_PASSWORD:-}" || -z "${SUPABASE_PROJECT_ID:-}" ]]; then
  echo "::error::Faltan SUPABASE_DB_PASSWORD o SUPABASE_PROJECT_ID."
  exit 1
fi

if [[ "$SUPABASE_DB_PASSWORD" == eyJ* ]]; then
  echo "::error::SUPABASE_*_DB_PASSWORD parece un JWT (anon/service_role)."
  echo "Usa la contraseña de Supabase → Project Settings → Database → Database password."
  exit 1
fi

echo "Verificando acceso Postgres ($label, ref ${SUPABASE_PROJECT_ID})…"
if ! supabase migration list --linked --password "$SUPABASE_DB_PASSWORD"; then
  cat >&2 <<'EOF'
::error::No se pudo autenticar en Postgres (28P01).

1. Supabase → Project Settings → Database → Reset database password
2. Copia la nueva contraseña (solo el password, no la URL completa)
3. GitHub → Environment dev/prod → actualiza SUPABASE_*_DB_PASSWORD
4. Confirma que SUPABASE_*_PROJECT_ID sea el ref del mismo proyecto
5. Re-run workflow

No uses anon key, service_role key ni connection string entera.
EOF
  exit 1
fi

echo "Aplicando migraciones ($label)…"
if supabase db push --yes --password "$SUPABASE_DB_PASSWORD"; then
  exit 0
fi

echo "Pooler falló; probando conexión directa db.${SUPABASE_PROJECT_ID}.supabase.co…"
enc_pass="$(python3 -c "import urllib.parse, os; print(urllib.parse.quote(os.environ['SUPABASE_DB_PASSWORD'], safe=''))")"
db_url="postgresql://postgres:${enc_pass}@db.${SUPABASE_PROJECT_ID}.supabase.co:5432/postgres"
exec supabase db push --yes --db-url "$db_url"
