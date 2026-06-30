-- Care pathway: normalized clinical episodes (parallel layer to patients).
-- Run in Supabase SQL Editor after schema.sql.
-- Safe to re-run: uses IF NOT EXISTS.

-- =========================================================
-- Episode header (one row per visit)
-- =========================================================
create table if not exists public.care_episodes (
  id                   uuid primary key default gen_random_uuid(),
  patient_id           text references public.patients(id) on delete set null,
  previous_episode_id  uuid references public.care_episodes(id) on delete set null,
  status               text not null default 'registered',
  collection_center_id uuid references public.collection_centers(id) on delete set null,
  source               text not null default 'live',
  started_at           timestamptz not null default now(),
  closed_at            timestamptz,
  created_by           uuid default auth.uid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint care_episodes_source_check check (source in ('live', 'backfill'))
);

create index if not exists care_episodes_patient_idx
  on public.care_episodes (patient_id);

create index if not exists care_episodes_status_idx
  on public.care_episodes (status);

create index if not exists care_episodes_previous_idx
  on public.care_episodes (previous_episode_id);

-- Solo un episodio abierto por paciente
create unique index if not exists care_episodes_one_open_per_patient_idx
  on public.care_episodes (patient_id)
  where patient_id is not null
    and status not in ('discharged', 'referred', 'cancelled');

-- =========================================================
-- Triage (1:1 with episode)
-- =========================================================
create table if not exists public.care_triage (
  id              uuid primary key default gen_random_uuid(),
  episode_id      uuid not null unique references public.care_episodes(id) on delete cascade,
  status          text not null default 'in_progress',
  weight_kg       numeric,
  height_cm       numeric,
  chief_complaint text,
  urgency_class   text default 'unclassified',
  completed_at    timestamptz,
  created_by      uuid default auth.uid(),
  created_at      timestamptz not null default now(),
  constraint care_triage_status_check
    check (status in ('in_progress', 'completed', 'cancelled')),
  constraint care_triage_urgency_check
    check (urgency_class in ('green', 'yellow', 'red', 'unclassified'))
);

-- =========================================================
-- Background snapshot header + child rows (1:N)
-- =========================================================
create table if not exists public.care_background_snapshots (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid not null unique references public.care_episodes(id) on delete cascade,
  captured_at timestamptz not null default now()
);

create table if not exists public.care_snapshot_allergies (
  id           uuid primary key default gen_random_uuid(),
  snapshot_id  uuid not null references public.care_background_snapshots(id) on delete cascade,
  allergy_text text not null
);

create table if not exists public.care_snapshot_conditions (
  id             uuid primary key default gen_random_uuid(),
  snapshot_id    uuid not null references public.care_background_snapshots(id) on delete cascade,
  condition_text text not null
);

create table if not exists public.care_snapshot_history_entries (
  id          uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.care_background_snapshots(id) on delete cascade,
  entry_text  text not null
);

create table if not exists public.care_snapshot_medications (
  id              uuid primary key default gen_random_uuid(),
  snapshot_id     uuid not null references public.care_background_snapshots(id) on delete cascade,
  medication_text text not null
);

-- =========================================================
-- Diagnoses and exams (1:N per episode)
-- =========================================================
create table if not exists public.care_diagnoses (
  id             uuid primary key default gen_random_uuid(),
  episode_id     uuid not null references public.care_episodes(id) on delete cascade,
  diagnosis_text text not null,
  kind           text not null default 'primary',
  recorded_at    timestamptz not null default now(),
  created_by     uuid default auth.uid(),
  constraint care_diagnoses_kind_check check (kind in ('primary', 'secondary'))
);

create index if not exists care_diagnoses_episode_idx
  on public.care_diagnoses (episode_id);

create table if not exists public.care_exams (
  id           uuid primary key default gen_random_uuid(),
  episode_id   uuid not null references public.care_episodes(id) on delete cascade,
  name         text not null,
  status       text not null default 'requested',
  result_text  text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by   uuid default auth.uid(),
  constraint care_exams_status_check
    check (status in ('requested', 'completed', 'cancelled'))
);

create index if not exists care_exams_episode_idx
  on public.care_exams (episode_id);

-- =========================================================
-- Treatments: catalog + rows per episode
-- =========================================================
create table if not exists public.care_treatment_kinds (
  code      text primary key,
  label_key text not null
);

insert into public.care_treatment_kinds (code, label_key) values
  ('general',           'treatment.general'),
  ('electrolyte_panel', 'treatment.electrolyte_panel'),
  ('saline_solution',   'treatment.saline_solution'),
  ('medication',        'treatment.medication'),
  ('hydration',         'treatment.hydration'),
  ('other',             'treatment.other')
on conflict (code) do nothing;

create table if not exists public.care_treatments (
  id          uuid primary key default gen_random_uuid(),
  episode_id  uuid not null references public.care_episodes(id) on delete cascade,
  kind_code   text not null references public.care_treatment_kinds(code),
  status      text not null default 'pending',
  started_at  timestamptz,
  ended_at    timestamptz,
  notes       text,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  constraint care_treatments_status_check
    check (status in ('pending', 'active', 'completed', 'suspended'))
);

create index if not exists care_treatments_episode_idx
  on public.care_treatments (episode_id);

-- =========================================================
-- Status transition audit log
-- =========================================================
create table if not exists public.care_status_events (
  id          bigint generated always as identity primary key,
  episode_id  uuid not null references public.care_episodes(id) on delete cascade,
  from_status text,
  to_status   text not null,
  actor       uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

create index if not exists care_status_events_episode_idx
  on public.care_status_events (episode_id, created_at desc);

-- =========================================================
-- Row Level Security
-- =========================================================
do $$
declare t text;
begin
  foreach t in array array[
    'care_episodes',
    'care_triage',
    'care_background_snapshots',
    'care_snapshot_allergies',
    'care_snapshot_conditions',
    'care_snapshot_history_entries',
    'care_snapshot_medications',
    'care_diagnoses',
    'care_exams',
    'care_treatment_kinds',
    'care_treatments',
    'care_status_events'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "%s all" on public.%I;', t, t);
    execute format(
      'create policy "%s all" on public.%I for all to authenticated using (true) with check (true);',
      t, t
    );
  end loop;
end $$;

grant select on table public.care_treatment_kinds to authenticated;

-- Migración incremental: columna de episodio previo en DBs ya creadas
alter table public.care_episodes
  add column if not exists previous_episode_id uuid references public.care_episodes(id) on delete set null;
