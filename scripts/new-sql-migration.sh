#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="${1:-}"

if [[ -z "$NAME" ]]; then
  echo "Uso: npm run db:migration:new -- nombre_corto_snake_case" >&2
  exit 1
fi

NAME="$(echo "$NAME" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9_' '_')"
VERSION="$(date +%Y%m%d%H%M%S)"
TARGET="$ROOT/supabase/migrations/${VERSION}_${NAME}.sql"

cp "$ROOT/supabase/migrations/_template.sql" "$TARGET"

if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/YYYYMMDDHHMMSS/${VERSION}/g" "$TARGET"
  sed -i '' "s/short_name/${NAME}/g" "$TARGET"
else
  sed -i "s/YYYYMMDDHHMMSS/${VERSION}/g" "$TARGET"
  sed -i "s/short_name/${NAME}/g" "$TARGET"
fi

echo "Creada: supabase/migrations/${VERSION}_${NAME}.sql"
