-- Census / Registry — Postgres schema for Supabase.
-- Paste ALL of this in: Supabase -> SQL Editor -> New query -> Run.

-- =========================================================
-- Main table: citizens
-- =========================================================
create table if not exists public.citizens (
  id              bigint generated always as identity primary key,
  -- 1. Personal data
  first_name      text,
  last_name       text,
  birth_date      date,
  age_years       text,
  age_months      text,
  gender          text,
  id_document     text,
  nationality     text,
  -- 2. Housing
  address         text,
  city            text,
  state_province  text,
  landmark        text,
  -- 3. Representative / contact
  contact_name    text,
  relationship    text,
  contact_id_document text,
  contact_occupation  text,
  phone_primary   text,
  phone_alternate text,
  email           text,
  -- 4. Health
  height_cm       text,
  weight_kg       text,
  blood_type      text,
  allergies       text,
  allergies_detail text,
  medical_condition text,
  medical_condition_detail text,
  medication      text,
  medication_detail text,
  vaccination     text,
  -- 5. Education
  attends_school  text,
  education_level text,
  grade           text,
  institution     text,
  -- Metadata
  geo_lat         double precision,
  geo_lng         double precision,
  geo_accuracy    double precision,
  created_at      timestamptz not null default now(),
  created_by      uuid default auth.uid()
);

-- =========================================================
-- Role helper: is the current user an admin?
-- Role lives in app_metadata (the user CANNOT change it).
-- =========================================================
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- =========================================================
-- Row Level Security (RLS)
-- =========================================================
alter table public.citizens enable row level security;

-- Any authenticated user can REGISTER (insert).
drop policy if exists "insert citizens" on public.citizens;
create policy "insert citizens"
  on public.citizens for insert to authenticated with check (true);

-- Read: admin sees all; a registrar sees only what they created.
drop policy if exists "select citizens" on public.citizens;
create policy "select citizens"
  on public.citizens for select to authenticated
  using (public.is_admin() or created_by = auth.uid());

-- Update / delete: admin ONLY. (Registrars cannot.)
drop policy if exists "admin update citizens" on public.citizens;
create policy "admin update citizens"
  on public.citizens for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin delete citizens" on public.citizens;
create policy "admin delete citizens"
  on public.citizens for delete to authenticated
  using (public.is_admin());

-- =========================================================
-- Audit: every INSERT/UPDATE/DELETE on citizens is logged
-- together with the user who performed it.
-- =========================================================
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  citizen_id  bigint,
  action      text,                       -- INSERT / UPDATE / DELETE
  actor       uuid,                       -- who did it
  actor_email text,
  data        jsonb,                      -- row snapshot
  created_at  timestamptz not null default now()
);

alter table public.audit_log enable row level security;

-- Only admin can read the audit log. Clients never insert into it
-- (the trigger writes it; it runs as definer and bypasses RLS).
drop policy if exists "admin read audit" on public.audit_log;
create policy "admin read audit"
  on public.audit_log for select to authenticated using (public.is_admin());

create or replace function public.log_citizen_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  select email into v_email from auth.users where id = auth.uid();
  insert into public.audit_log(citizen_id, action, actor, actor_email, data)
  values (coalesce(new.id, old.id), tg_op, auth.uid(), v_email, to_jsonb(coalesce(new, old)));
  return coalesce(new, old);
end; $$;

drop trigger if exists trg_audit_citizens on public.citizens;
create trigger trg_audit_citizens
  after insert or update or delete on public.citizens
  for each row execute function public.log_citizen_change();

-- =========================================================
-- General statistics for ANY authenticated user.
-- SECURITY DEFINER: returns only aggregate counts (no individual
-- rows), so it does not leak other people's data.
-- =========================================================
create or replace function public.general_stats()
returns json language sql security definer set search_path = public stable as $$
  select json_build_object(
    'total', (select count(*) from citizens),
    'today', (select count(*) from citizens where created_at::date = now()::date),
    'last7', (select count(*) from citizens where created_at > now() - interval '7 days'),
    'mine',  (select count(*) from citizens where created_by = auth.uid())
  );
$$;

grant execute on function public.general_stats() to authenticated;

-- =========================================================
-- App React: tabla de pacientes (censo general + historia clínica)
-- Cada registro se guarda como JSONB para soportar campos
-- opcionales/condicionales (p. ej. la sección pediátrica solo
-- aplica a menores) sin migraciones de columnas.
-- =========================================================
create table if not exists public.pacientes (
  id          text primary key,            -- id generado por la app (pac-xxxx)
  data        jsonb not null,              -- objeto Paciente completo
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists pacientes_created_at_idx on public.pacientes (created_at desc);

alter table public.pacientes enable row level security;

-- Registros compartidos entre usuarios autenticados (multi-dispositivo).
drop policy if exists "pacientes select" on public.pacientes;
create policy "pacientes select"
  on public.pacientes for select to authenticated using (true);

drop policy if exists "pacientes insert" on public.pacientes;
create policy "pacientes insert"
  on public.pacientes for insert to authenticated with check (true);

drop policy if exists "pacientes update" on public.pacientes;
create policy "pacientes update"
  on public.pacientes for update to authenticated using (true) with check (true);

drop policy if exists "pacientes delete" on public.pacientes;
create policy "pacientes delete"
  on public.pacientes for delete to authenticated using (true);
