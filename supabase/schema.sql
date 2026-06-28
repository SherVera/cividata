-- Censo Infantil — esquema Postgres para Supabase.
-- Pegar TODO esto en: Supabase -> SQL Editor -> New query -> Run.

create table if not exists public.registros (
  id              bigint generated always as identity primary key,
  -- 1. Datos personales
  nombres         text,
  apellidos       text,
  fecha_nacimiento date,
  edad_anios      text,
  edad_meses      text,
  genero          text,
  documento       text,
  nacionalidad    text,
  -- 2. Vivienda
  direccion       text,
  ciudad          text,
  estado_provincia text,
  punto_referencia text,
  -- 3. Representante legal
  rep_nombre      text,
  parentesco      text,
  rep_documento   text,
  rep_ocupacion   text,
  tel_principal   text,
  tel_alternativo text,
  correo          text,
  -- 4. Salud
  estatura_cm     text,
  peso_kg         text,
  grupo_sanguineo text,
  alergia         text,
  alergia_detalle text,
  condicion_medica text,
  condicion_detalle text,
  medicamento     text,
  medicamento_detalle text,
  vacunacion      text,
  -- 5. Educación
  asiste          text,
  nivel_educativo text,
  grado           text,
  institucion     text,
  -- Metadata
  geo_lat         double precision,
  geo_lng         double precision,
  geo_accuracy    double precision,
  created_at      timestamptz not null default now(),
  created_by      uuid default auth.uid()
);

-- Seguridad: nadie sin sesión puede leer ni escribir.
alter table public.registros enable row level security;

create policy "usuarios autenticados pueden insertar"
  on public.registros for insert to authenticated with check (true);

create policy "usuarios autenticados pueden leer"
  on public.registros for select to authenticated using (true);
