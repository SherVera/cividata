#!/usr/bin/env bash
# Marca como aplicadas las migraciones locales que aún no están en remoto.
# Ejecutar UNA VEZ por proyecto Supabase (dev y prod por separado) si la DB ya existía.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS_DIR="$ROOT/supabase/migrations"
LINKED_JSON="$ROOT/supabase/.temp/linked-project.json"
PROJECT_REF_FILE="$ROOT/supabase/.temp/project-ref"
ENV_FILE="$ROOT/.env"

# npm no carga .env en scripts bash; leer solo claves Supabase CLI (sin source completo).
read_dotenv_key() {
  local key="$1"
  [[ -f "$ENV_FILE" ]] || return 1
  local line raw
  line=$(grep -E "^[[:space:]]*${key}=" "$ENV_FILE" 2>/dev/null | tail -1 || true)
  [[ -n "$line" ]] || return 1
  raw="${line#*=}"
  raw="${raw//$'\r'/}"
  raw="${raw#"${raw%%[![:space:]]*}"}"
  raw="${raw%"${raw##*[![:space:]]}"}"
  if [[ "$raw" == \"*\" && "$raw" == *\" ]]; then raw="${raw:1:-1}"; fi
  if [[ "$raw" == \'*\' && "$raw" == *\' ]]; then raw="${raw:1:-1}"; fi
  printf '%s' "$raw"
}

load_supabase_env_from_dotenv() {
  if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
    SUPABASE_DB_PASSWORD="$(read_dotenv_key SUPABASE_DB_PASSWORD || true)"
    if [[ -z "$SUPABASE_DB_PASSWORD" ]]; then
      SUPABASE_DB_PASSWORD="$(read_dotenv_key SUPABASE_DEV_DB_PASSWORD || true)"
    fi
    if [[ -z "$SUPABASE_DB_PASSWORD" ]]; then
      SUPABASE_DB_PASSWORD="$(read_dotenv_key SUPABASE_PROD_DB_PASSWORD || true)"
    fi
  fi
  if [[ -z "${SUPABASE_PROJECT_ID:-}" ]]; then
    SUPABASE_PROJECT_ID="$(read_dotenv_key SUPABASE_PROJECT_ID || true)"
  fi
  if [[ -z "${SUPABASE_PROJECT_ID:-}" ]]; then
    local url
    url="$(read_dotenv_key SUPABASE_URL || true)"
    if [[ -z "$url" ]]; then
      url="$(read_dotenv_key VITE_SUPABASE_URL || true)"
    fi
    if [[ "$url" =~ https?://([a-z0-9-]+)\.supabase\.co ]]; then
      SUPABASE_PROJECT_ID="${BASH_REMATCH[1]}"
    fi
  fi
  if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
    SUPABASE_ACCESS_TOKEN="$(read_dotenv_key SUPABASE_ACCESS_TOKEN || true)"
  fi
}

load_supabase_env_from_dotenv

read_linked_ref() {
  if [[ -f "$LINKED_JSON" ]]; then
    node -e "const j=require('$LINKED_JSON'); process.stdout.write(j.ref||'')" 2>/dev/null && return 0
  fi
  if [[ -f "$PROJECT_REF_FILE" ]]; then
    tr -d '[:space:]' < "$PROJECT_REF_FILE"
    return 0
  fi
  return 1
}

collect_local_migration_versions() {
  local f base version
  for f in "$MIGRATIONS_DIR"/[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]_*.sql; do
    [[ -f "$f" ]] || continue
    base="$(basename "$f")"
    version="${base%%_*}"
    echo "$version"
  done | sort -u
}

if [[ -z "${SUPABASE_PROJECT_ID:-}" ]]; then
  if linked_ref="$(read_linked_ref)"; then
    SUPABASE_PROJECT_ID="$linked_ref"
    echo "Usando proyecto enlazado: ${SUPABASE_PROJECT_ID}"
  fi
fi

if [[ -z "${SUPABASE_PROJECT_ID:-}" ]]; then
  cat >&2 <<'EOF'
Falta SUPABASE_PROJECT_ID.

  export SUPABASE_DB_PASSWORD='database-password'
  npx supabase link --project-ref TU_REF --password "$SUPABASE_DB_PASSWORD"
  npm run db:repair-baseline

O exporte SUPABASE_PROJECT_ID y SUPABASE_DB_PASSWORD antes de ejecutar.
EOF
  exit 1
fi

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  cat >&2 <<'EOF'
Falta SUPABASE_DB_PASSWORD (contraseña de Database en Supabase, no anon ni service_role).

  Añádala a .env como SUPABASE_DB_PASSWORD=...
  o: export SUPABASE_DB_PASSWORD='...' && npm run db:repair-baseline
EOF
  exit 1
fi

export SUPABASE_DB_PASSWORD
[[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]] && export SUPABASE_ACCESS_TOKEN

build_pooler_db_url() {
  local pooler_file="$ROOT/supabase/.temp/pooler-url"
  [[ -f "$pooler_file" ]] || return 1
  node -e "
    const fs = require('fs');
    const pooler = fs.readFileSync(process.argv[1], 'utf8').trim().replace(/\r$/, '');
    const pass = process.argv[2];
    const m = pooler.match(/^postgresql:\\/\\/([^@]+)@(.+)$/);
    if (!m) process.exit(1);
    console.log('postgresql://' + m[1] + ':' + encodeURIComponent(pass) + '@' + m[2]);
  " "$pooler_file" "$SUPABASE_DB_PASSWORD"
}

build_direct_db_url() {
  node -e "
    const ref = process.argv[1];
    const pass = encodeURIComponent(process.argv[2]);
    console.log('postgresql://postgres:' + pass + '@db.' + ref + '.supabase.co:5432/postgres');
  " "$SUPABASE_PROJECT_ID" "$SUPABASE_DB_PASSWORD"
}

run_migration_repair() {
  local version="$1"
  local db_url

  if supabase migration repair --linked --password "$SUPABASE_DB_PASSWORD" --status applied "$version" 2>/dev/null; then
    return 0
  fi

  if db_url="$(build_pooler_db_url 2>/dev/null)"; then
    echo "  Reintentando pooler session (5432)…"
    if supabase migration repair --db-url "$db_url" --status applied "$version" 2>/dev/null; then
      return 0
    fi
  fi

  if db_url="$(build_direct_db_url 2>/dev/null)"; then
    echo "  Reintentando conexión directa db.${SUPABASE_PROJECT_ID}.supabase.co…"
    if supabase migration repair --db-url "$db_url" --status applied "$version" 2>/dev/null; then
      return 0
    fi
  fi

  return 1
}

print_sql_fallback() {
  cat >&2 <<'EOF'

No se pudo conectar con supabase migration repair (el link sí puede funcionar).

Alternativa — SQL Editor en Supabase (dev o prod):

  npm run db:repair-baseline:sql

Copie el SQL generado → Supabase → SQL Editor → Run.
Luego verifique: npx supabase migration list

EOF
  node "$ROOT/scripts/generate-migration-repair-sql.mjs" >&2 || true
  exit 1
}

echo "Enlazando proyecto ${SUPABASE_PROJECT_ID}…"
supabase link --project-ref "$SUPABASE_PROJECT_ID" --password "$SUPABASE_DB_PASSWORD"

VERSIONS=()
while IFS= read -r version; do
  [[ -n "$version" ]] && VERSIONS+=("$version")
done < <(collect_local_migration_versions)

if [[ ${#VERSIONS[@]} -eq 0 ]]; then
  echo "No hay migraciones en ${MIGRATIONS_DIR}." >&2
  exit 1
fi

echo "Marcando ${#VERSIONS[@]} migración(es) como applied…"
repair_failed=0
for v in "${VERSIONS[@]}"; do
  echo "→ repair applied ${v}"
  if ! run_migration_repair "$v"; then
    repair_failed=1
    break
  fi
done

if [[ "$repair_failed" -eq 1 ]]; then
  print_sql_fallback
fi

echo "Listo. Verifique con: npx supabase migration list"
