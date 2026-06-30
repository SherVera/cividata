-- Migration: YYYYMMDDHHMMSS_short_name
-- Descripción: qué cambia y por qué.
--
-- Crear copia con: npm run db:migration:new -- short_name
-- El CLI de Supabase trackea las versiones aplicadas (supabase_migrations.schema_migrations);
-- cada archivo corre una sola vez. Usar IF NOT EXISTS / ADD COLUMN IF NOT EXISTS por seguridad.

-- alter table public.patients add column if not exists ejemplo text;
