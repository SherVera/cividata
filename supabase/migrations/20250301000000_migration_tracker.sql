-- Cividata: control de migraciones SQL incrementales.
-- Ejecutar UNA VEZ en Supabase → SQL Editor (idempotente).

create table if not exists public.schema_migrations (
  version     text primary key,
  name        text not null,
  applied_at  timestamptz not null default now(),
  applied_by  uuid default auth.uid(),
  notes       text
);

create index if not exists schema_migrations_applied_at_idx
  on public.schema_migrations (applied_at desc);

comment on table public.schema_migrations is
  'Registro de migraciones SQL aplicadas. Cada archivo en supabase/migrations/ debe insertar su version al final.';

-- Ver qué está aplicado:
--   select version, name, applied_at from public.schema_migrations order by version;
