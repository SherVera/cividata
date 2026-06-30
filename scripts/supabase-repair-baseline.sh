#!/usr/bin/env bash
# Marca migraciones baseline como ya aplicadas en un proyecto Supabase existente.
# Ejecutar UNA VEZ por proyecto (dev y prod por separado) antes del primer deploy automático.
set -euo pipefail

if [[ -z "${SUPABASE_PROJECT_ID:-}" ]]; then
  echo "Defina SUPABASE_PROJECT_ID (ref del proyecto)." >&2
  exit 1
fi

VERSIONS=(
  20250101000000
  20250301000000
  20250301000001
  20250301000002
)

echo "Enlazando proyecto ${SUPABASE_PROJECT_ID}…"
supabase link --project-ref "$SUPABASE_PROJECT_ID"

for v in "${VERSIONS[@]}"; do
  echo "→ repair applied ${v}"
  supabase migration repair --status applied "$v"
done

echo "Listo. Verifique con: supabase migration list"
