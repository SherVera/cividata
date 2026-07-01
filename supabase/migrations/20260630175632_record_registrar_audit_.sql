-- Auditoría de registro: quién capturó paciente/nota; vínculo solicitud → usuario creado.

alter table public.staff_signup_requests
  add column if not exists approved_user_id uuid;

comment on column public.staff_signup_requests.approved_user_id is
  'Usuario auth creado al aprobar la solicitud (si aplica).';

create or replace function public.set_patient_registrar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  elsif tg_op = 'UPDATE' and new.created_by is distinct from old.created_by then
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_patient_registrar on public.patients;
create trigger trg_patient_registrar
  before insert or update on public.patients
  for each row execute function public.set_patient_registrar();

create or replace function public.set_clinical_note_registrar()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  elsif tg_op = 'UPDATE' and new.created_by is distinct from old.created_by then
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clinical_note_registrar on public.clinical_notes;
create trigger trg_clinical_note_registrar
  before insert or update on public.clinical_notes
  for each row execute function public.set_clinical_note_registrar();
