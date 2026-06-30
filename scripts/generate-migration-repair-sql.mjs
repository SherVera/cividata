#!/usr/bin/env node
/**
 * Genera SQL para inicializar el historial CLI y marcar migraciones como applied.
 * Usar en Supabase → SQL Editor si el CLI no conecta desde local/CI.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(root, 'supabase/migrations');

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => /^\d{14}_.+\.sql$/.test(f))
  .sort();

if (files.length === 0) {
  console.error('No hay migraciones en supabase/migrations/');
  process.exit(1);
}

const rows = files.map((f) => {
  const version = f.slice(0, 14);
  const name = f.replace(/\.sql$/, '');
  return { version, name };
});

console.log(`-- Inicializar historial CLI + marcar ${rows.length} migración(es) como applied`);
console.log('-- Ejecutar en Supabase → SQL Editor (dev o prod). No altera datos de pacientes.\n');

console.log(`begin;

-- Tabla que usa supabase db push / migration list (no existía si la DB se creó a mano)
create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
  version text not null primary key
);

alter table supabase_migrations.schema_migrations
  add column if not exists statements text[];

alter table supabase_migrations.schema_migrations
  add column if not exists name text;
`);

for (const { version, name } of rows) {
  const safeName = name.replace(/'/g, "''");
  console.log(`
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('${version}', '${safeName}', '{}'::text[])
on conflict (version) do nothing;`);
}

console.log(`
commit;

-- Verificar:
-- select version, name from supabase_migrations.schema_migrations order by version;
`);
