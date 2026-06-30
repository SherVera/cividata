-- Migración legacy → care_pathway (idempotente).
-- Ejecutar UNA VEZ después de care_pathway.sql.
-- No modifica patients ni clinical_notes.

create or replace function public.care_classify_treatment_kind(treatment_text text)
returns text
language sql
immutable
as $$
  select case
    when treatment_text is null or btrim(treatment_text) = '' then 'other'
    when lower(treatment_text) ~ '(electrolit|electrolyte)' then 'electrolyte_panel'
    when lower(treatment_text) ~ '(salina|saline|suero|ssn|nacl)' then 'saline_solution'
    when lower(treatment_text) ~ '(hidrat|rehidrat|oral rehydration)' then 'hydration'
    when lower(treatment_text) ~ '(medic|antib|amox|ibupro|paracet|acetamin)' then 'medication'
    else 'general'
  end;
$$;

insert into public.care_episodes (
  patient_id,
  previous_episode_id,
  status,
  collection_center_id,
  source,
  started_at,
  closed_at,
  created_by,
  created_at,
  updated_at
)
select
  p.id,
  null,
  case
    when exists (
      select 1
      from public.clinical_notes cn
      join public.treatments t on t.id = cn.treatment_id
      where cn.patient_id = p.id
        and btrim(coalesce(t.name, '')) <> ''
    ) then 'in_treatment'
    when exists (
      select 1 from public.clinical_notes cn where cn.patient_id = p.id
    ) then 'care_started'
    else 'triage_completed'
  end,
  p.collection_center_id,
  'backfill',
  coalesce(p.created_at, p.registered_at::timestamptz, now()),
  null,
  p.created_by,
  coalesce(p.created_at, now()),
  coalesce(p.updated_at, now())
from public.patients p
where not exists (
  select 1
  from public.care_episodes ce
  where ce.patient_id = p.id
    and ce.source = 'backfill'
);

insert into public.care_triage (
  episode_id,
  status,
  weight_kg,
  height_cm,
  chief_complaint,
  urgency_class,
  completed_at,
  created_by,
  created_at
)
select
  ce.id,
  'completed',
  p.weight_kg,
  p.height_cm,
  coalesce(
    (
      select cn.reason
      from public.clinical_notes cn
      where cn.patient_id = p.id
        and btrim(coalesce(cn.reason, '')) <> ''
      order by coalesce(cn.note_date, cn.created_at::date) desc, cn.created_at desc
      limit 1
    ),
    ''
  ),
  'unclassified',
  coalesce(p.created_at, p.registered_at::timestamptz, now()),
  p.created_by,
  coalesce(p.created_at, now())
from public.care_episodes ce
join public.patients p on p.id = ce.patient_id
where ce.source = 'backfill'
  and not exists (
    select 1 from public.care_triage ct where ct.episode_id = ce.id
  );

insert into public.care_background_snapshots (episode_id, captured_at)
select ce.id, coalesce(ce.started_at, now())
from public.care_episodes ce
where ce.source = 'backfill'
  and not exists (
    select 1 from public.care_background_snapshots s where s.episode_id = ce.id
  );

insert into public.care_snapshot_allergies (snapshot_id, allergy_text)
select s.id, x.allergy_text
from public.care_background_snapshots s
join public.care_episodes ce on ce.id = s.episode_id
join public.patients p on p.id = ce.patient_id
left join public.allergies a on a.id = p.allergy_id
cross join lateral (
  select btrim(
    coalesce(
      nullif(p.allergies_detail, ''),
      nullif(a.name, ''),
      'Alergia registrada sin detalle'
    )
  ) as allergy_text
) x
where ce.source = 'backfill'
  and p.has_allergies is true
  and btrim(x.allergy_text) <> ''
  and not exists (
    select 1 from public.care_snapshot_allergies csa where csa.snapshot_id = s.id
  );

insert into public.care_snapshot_conditions (snapshot_id, condition_text)
select s.id, x.condition_text
from public.care_background_snapshots s
join public.care_episodes ce on ce.id = s.episode_id
join public.patients p on p.id = ce.patient_id
left join public.medical_conditions mc on mc.id = p.condition_id
cross join lateral (
  select btrim(
    coalesce(
      nullif(p.condition_detail, ''),
      nullif(mc.name, ''),
      'Condición registrada sin detalle'
    )
  ) as condition_text
) x
where ce.source = 'backfill'
  and p.has_condition is true
  and btrim(x.condition_text) <> ''
  and not exists (
    select 1 from public.care_snapshot_conditions csc where csc.snapshot_id = s.id
  );

insert into public.care_snapshot_medications (snapshot_id, medication_text)
select s.id, x.medication_text
from public.care_background_snapshots s
join public.care_episodes ce on ce.id = s.episode_id
join public.patients p on p.id = ce.patient_id
left join public.medications m on m.id = p.medication_id
cross join lateral (
  select btrim(
    coalesce(
      nullif(p.medication_detail, ''),
      nullif(m.name, ''),
      'Medicamento registrado sin detalle'
    )
  ) as medication_text
) x
where ce.source = 'backfill'
  and p.takes_medication is true
  and btrim(x.medication_text) <> ''
  and not exists (
    select 1 from public.care_snapshot_medications csm where csm.snapshot_id = s.id
  );

insert into public.care_diagnoses (
  episode_id,
  diagnosis_text,
  kind,
  recorded_at,
  created_by
)
select
  ce.id,
  d.name,
  case when row_number() over (
    partition by ce.id
    order by coalesce(cn.note_date, cn.created_at::date), cn.created_at
  ) = 1 then 'primary' else 'secondary' end,
  coalesce(cn.note_date::timestamptz, cn.created_at, now()),
  cn.created_by
from public.care_episodes ce
join public.clinical_notes cn on cn.patient_id = ce.patient_id
join public.diagnoses d on d.id = cn.diagnosis_id
where ce.source = 'backfill'
  and btrim(coalesce(d.name, '')) <> ''
  and not exists (
    select 1
    from public.care_diagnoses cd
    where cd.episode_id = ce.id
      and cd.diagnosis_text = d.name
      and cd.recorded_at = coalesce(cn.note_date::timestamptz, cn.created_at, now())
  );

insert into public.care_treatments (
  episode_id,
  kind_code,
  status,
  started_at,
  ended_at,
  notes,
  created_by,
  created_at
)
select
  ce.id,
  public.care_classify_treatment_kind(t.name),
  case
    when cn.note_date is not null and cn.note_date < (current_date - interval '30 days')
      then 'completed'
    else 'active'
  end,
  coalesce(cn.note_date::timestamptz, cn.created_at, now()),
  case
    when cn.note_date is not null and cn.note_date < (current_date - interval '30 days')
      then coalesce(cn.note_date::timestamptz, cn.created_at, now())
    else null
  end,
  t.name,
  cn.created_by,
  coalesce(cn.created_at, now())
from public.care_episodes ce
join public.clinical_notes cn on cn.patient_id = ce.patient_id
join public.treatments t on t.id = cn.treatment_id
where ce.source = 'backfill'
  and btrim(coalesce(t.name, '')) <> ''
  and not exists (
    select 1
    from public.care_treatments ct
    where ct.episode_id = ce.id
      and ct.notes = t.name
      and ct.started_at = coalesce(cn.note_date::timestamptz, cn.created_at, now())
  );

insert into public.care_status_events (episode_id, from_status, to_status, actor, created_at)
select
  ce.id,
  null,
  ce.status,
  ce.created_by,
  ce.created_at
from public.care_episodes ce
where ce.source = 'backfill'
  and not exists (
    select 1 from public.care_status_events e where e.episode_id = ce.id
  );
