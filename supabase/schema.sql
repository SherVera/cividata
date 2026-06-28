-- Censo / Registro — esquema Postgres para Supabase.
-- Pegar TODO esto en: Supabase -> SQL Editor -> New query -> Run.

-- =========================================================
-- Tabla principal de ciudadanos / registros
-- =========================================================
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
  -- 3. Representante / contacto
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

-- =========================================================
-- Helper de rol: ¿el usuario actual es admin?
-- El rol vive en app_metadata (NO lo puede cambiar el usuario).
-- =========================================================
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- =========================================================
-- Seguridad por filas (RLS)
-- =========================================================
alter table public.registros enable row level security;

-- Cualquier usuario autenticado puede REGISTRAR (insertar).
drop policy if exists "insertar registros" on public.registros;
create policy "insertar registros"
  on public.registros for insert to authenticated with check (true);

-- Lectura: admin ve todo; el registrador ve solo lo que él registró.
drop policy if exists "leer registros" on public.registros;
create policy "leer registros"
  on public.registros for select to authenticated
  using (public.is_admin() or created_by = auth.uid());

-- Modificar / borrar: SOLO admin. (Los registradores no pueden.)
drop policy if exists "admin actualiza" on public.registros;
create policy "admin actualiza"
  on public.registros for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin borra" on public.registros;
create policy "admin borra"
  on public.registros for delete to authenticated
  using (public.is_admin());

-- =========================================================
-- Auditoría: cada INSERT/UPDATE/DELETE sobre registros
-- queda registrado con el usuario que lo hizo.
-- =========================================================
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  registro_id bigint,
  accion      text,                       -- INSERT / UPDATE / DELETE
  actor       uuid,                       -- quién lo hizo
  actor_email text,
  datos       jsonb,                      -- snapshot de la fila
  created_at  timestamptz not null default now()
);

alter table public.audit_log enable row level security;

-- Solo admin puede leer la auditoría. Nadie la inserta desde el cliente
-- (la escribe el trigger, que corre como definer y salta RLS).
drop policy if exists "admin lee auditoria" on public.audit_log;
create policy "admin lee auditoria"
  on public.audit_log for select to authenticated using (public.is_admin());

create or replace function public.log_registro() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  insert into public.audit_log(registro_id, accion, actor, actor_email, datos)
  values (coalesce(new.id, old.id), tg_op, auth.uid(), v_email, to_jsonb(coalesce(new, old)));
  return coalesce(new, old);
end; $$;

drop trigger if exists trg_audit_registros on public.registros;
create trigger trg_audit_registros
  after insert or update or delete on public.registros
  for each row execute function public.log_registro();
