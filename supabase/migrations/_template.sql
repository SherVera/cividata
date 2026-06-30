-- Migration: YYYYMMDDHHMMSS_short_name
-- Descripción: qué cambia y por qué.
--
-- Crear copia con: npm run db:migration:new -- short_name
-- Aplicar en Supabase → SQL Editor → Run (un archivo a la vez, en orden).

do $$
begin
  if exists (
    select 1 from public.schema_migrations where version = 'YYYYMMDDHHMMSS'
  ) then
    raise notice 'Migration YYYYMMDDHHMMSS already applied, skipping.';
    return;
  end if;

  -- =========================================================
  -- Cambios (usar IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
  -- =========================================================

  -- alter table public.patients add column if not exists ejemplo text;

  insert into public.schema_migrations (version, name, notes)
  values (
    'YYYYMMDDHHMMSS',
    'short_name',
    'Descripción breve del cambio'
  );
end $$;
