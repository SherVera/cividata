-- Marca el estado histórico ANTES del sistema de migraciones.
-- No ejecuta DDL: solo documenta qué archivos ya se aplicaron a mano.
-- Ejecutar después de 20250301000000_migration_tracker.sql (idempotente).

insert into public.schema_migrations (version, name, notes)
values
  (
    '20250101000000',
    'bootstrap_schema',
    'supabase/migrations/20250101000000_bootstrap_schema.sql (antes schema.sql monolítico)'
  ),
  (
    '20250101000001',
    'legacy_schema',
    'alias histórico de bootstrap_schema'
  ),
  (
    '20250101000002',
    'legacy_supply_requests',
    'supabase/supply_requests.sql — contenido incluido en bootstrap_schema; archivo legacy'
  ),
  (
    '20250101000003',
    'legacy_care_pathway',
    'supabase/migrations/20250301000002_care_pathway.sql (antes care_pathway.sql suelto)'
  ),
  (
    '20250101000004',
    'legacy_care_pathway_backfill',
    'supabase/care_pathway_backfill.sql — migración única de datos legacy (opcional)'
  )
on conflict (version) do nothing;
