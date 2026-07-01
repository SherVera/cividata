-- Tipo de establecimiento en collection_centers (acopio vs hospital).
-- Todos los centros existentes quedan como acopio; hospitales sin insumos por ahora.

alter table public.collection_centers
  add column if not exists facility_type text not null default 'acopio';

alter table public.collection_centers
  drop constraint if exists collection_centers_facility_type_check;

alter table public.collection_centers
  add constraint collection_centers_facility_type_check
  check (facility_type in ('acopio', 'hospital'));

comment on column public.collection_centers.facility_type is
  'acopio = captura e insumos; hospital = atención clínica (sin módulo de insumos por ahora).';
