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
-- React app: relational schema (normalized, flat tables).
-- Catalog tables hold reusable values so staff don't retype
-- repeated data; new entries are created on the fly.
-- =========================================================

-- ---- Helper: apply "any authenticated user" RLS to a table ----
-- (shared registry, multi-user / multi-device)

-- Catalog: nationalities
create table if not exists public.nationalities (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

-- Catalog: states / provinces
create table if not exists public.states (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

-- Catalog: cities / municipalities (optionally linked to a state)
create table if not exists public.cities (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  state_id  uuid references public.states(id) on delete set null,
  unique (name, state_id)
);

-- Catalog: educational institutions
create table if not exists public.institutions (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

-- Health catalogs (reusable; created on the fly, filtered when they exist)
create table if not exists public.blood_types (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

create table if not exists public.allergies (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

create table if not exists public.medical_conditions (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

create table if not exists public.medications (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

create table if not exists public.diagnoses (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

create table if not exists public.treatments (
  id    uuid primary key default gen_random_uuid(),
  name  text not null unique
);

-- Reusable guardians / contacts (one guardian -> many patients)
create table if not exists public.guardians (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  id_document     text unique,
  occupation      text,
  phone_primary   text,
  phone_alternate text,
  email           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Main table: patients (flat columns + foreign keys)
create table if not exists public.patients (
  id                 text primary key,
  first_name         text not null,
  last_name          text not null,
  birth_date         date,
  gender             text,
  id_document        text,
  nationality_id     uuid references public.nationalities(id) on delete set null,
  address            text,
  state_id           uuid references public.states(id) on delete set null,
  city_id            uuid references public.cities(id) on delete set null,
  landmark           text,
  guardian_id        uuid references public.guardians(id) on delete set null,
  relationship       text,
  height_cm          numeric,
  weight_kg          numeric,
  blood_type_id      uuid references public.blood_types(id) on delete set null,
  has_allergies      boolean not null default false,
  allergy_id         uuid references public.allergies(id) on delete set null,
  has_condition      boolean not null default false,
  condition_id       uuid references public.medical_conditions(id) on delete set null,
  takes_medication   boolean not null default false,
  medication_id      uuid references public.medications(id) on delete set null,
  vaccination_scheme text,
  attends_school     boolean not null default false,
  education_level    text,
  grade              text,
  institution_id     uuid references public.institutions(id) on delete set null,
  registered_at      date not null default now(),
  created_by         uuid default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists patients_created_at_idx on public.patients (created_at desc);
create index if not exists patients_guardian_idx on public.patients (guardian_id);

-- Clinical notes / evolution (one patient -> many notes)
create table if not exists public.clinical_notes (
  id            text primary key,
  patient_id    text not null references public.patients(id) on delete cascade,
  note_date     date,
  weight        numeric,
  height        numeric,
  reason        text,
  diagnosis_id  uuid references public.diagnoses(id) on delete set null,
  treatment_id  uuid references public.treatments(id) on delete set null,
  created_by    uuid default auth.uid(),
  created_at    timestamptz not null default now()
);

create index if not exists clinical_notes_patient_idx on public.clinical_notes (patient_id);

-- ---- Migration helpers: upgrade an existing DB to the relational health model ----
alter table public.patients add column if not exists blood_type_id uuid references public.blood_types(id) on delete set null;
alter table public.patients add column if not exists allergy_id    uuid references public.allergies(id) on delete set null;
alter table public.patients add column if not exists condition_id  uuid references public.medical_conditions(id) on delete set null;
alter table public.patients add column if not exists medication_id uuid references public.medications(id) on delete set null;
alter table public.patients drop column if exists blood_type;
alter table public.patients drop column if exists allergies_detail;
alter table public.patients drop column if exists condition_detail;
alter table public.patients drop column if exists medication_detail;

alter table public.clinical_notes add column if not exists diagnosis_id uuid references public.diagnoses(id) on delete set null;
alter table public.clinical_notes add column if not exists treatment_id uuid references public.treatments(id) on delete set null;
alter table public.clinical_notes drop column if exists diagnosis;
alter table public.clinical_notes drop column if exists treatment;

-- ---- Row Level Security: authenticated users share all data ----
do $$
declare t text;
begin
  foreach t in array array[
    'nationalities','states','cities','institutions',
    'blood_types','allergies','medical_conditions','medications','diagnoses','treatments',
    'guardians','patients','clinical_notes'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "%s all" on public.%I;', t, t);
    execute format(
      'create policy "%s all" on public.%I for all to authenticated using (true) with check (true);',
      t, t
    );
  end loop;
end $$;
