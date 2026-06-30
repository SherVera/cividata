-- Registro de necesidades y recepciones por centro de acopio.
-- Clasificaciones en tabla aparte (creables por usuarios).
-- Ejecutar en Supabase → SQL Editor (seguro re-ejecutar).

-- =========================================================
-- Catálogo de clasificaciones
-- =========================================================
create table if not exists public.supply_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create unique index if not exists supply_categories_name_lower_idx
  on public.supply_categories (lower(trim(name)));

insert into public.supply_categories (name)
select v.name
from (values
  ('Medicinas'),
  ('Insumos'),
  ('Material médico'),
  ('Equipamiento'),
  ('Otro')
) as v(name)
where not exists (
  select 1 from public.supply_categories c
  where lower(trim(c.name)) = lower(trim(v.name))
);

-- =========================================================
-- Movimientos por centro
-- =========================================================
create table if not exists public.center_supply_entries (
  id                    uuid primary key default gen_random_uuid(),
  collection_center_id  uuid not null references public.collection_centers(id) on delete cascade,
  entry_date            date not null default current_date,
  item_name             text not null,
  quantity              numeric not null check (quantity > 0),
  entry_type            text not null check (entry_type in ('necesidad', 'recepcion')),
  created_by            uuid not null default auth.uid(),
  created_at            timestamptz not null default now()
);

alter table public.center_supply_entries add column if not exists category_id uuid;

-- Migración: columna legacy category (text) → category_id
do $$
declare
  cat record;
  cat_id uuid;
  legacy text;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'center_supply_entries'
      and column_name = 'category'
  ) then
    for legacy in
      select distinct category from public.center_supply_entries where category is not null
    loop
      insert into public.supply_categories (name)
      select mapped.name
      from (select
        case legacy
          when 'medicinas' then 'Medicinas'
          when 'insumos' then 'Insumos'
          when 'material_medico' then 'Material médico'
          when 'equipamiento' then 'Equipamiento'
          when 'otro' then 'Otro'
          else initcap(replace(legacy, '_', ' '))
        end as name
      ) mapped
      where not exists (
        select 1 from public.supply_categories c
        where lower(trim(c.name)) = lower(trim(mapped.name))
      );

      select id into cat_id
      from public.supply_categories
      where lower(trim(name)) = lower(trim(
        case legacy
          when 'medicinas' then 'Medicinas'
          when 'insumos' then 'Insumos'
          when 'material_medico' then 'Material médico'
          when 'equipamiento' then 'Equipamiento'
          when 'otro' then 'Otro'
          else initcap(replace(legacy, '_', ' '))
        end
      ))
      limit 1;

      update public.center_supply_entries
      set category_id = cat_id
      where category = legacy and category_id is null;
    end loop;

    alter table public.center_supply_entries drop column if exists category;
  end if;
end $$;

-- Filas sin category_id: asignar «Insumos» por defecto
update public.center_supply_entries e
set category_id = c.id
from public.supply_categories c
where e.category_id is null
  and lower(trim(c.name)) = 'insumos';

alter table public.center_supply_entries drop constraint if exists center_supply_entries_category_id_fkey;
alter table public.center_supply_entries
  add constraint center_supply_entries_category_id_fkey
  foreign key (category_id) references public.supply_categories(id) on delete restrict;

-- Migración desde supply_requests (esquema muy anterior).
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'supply_requests'
  ) then
    insert into public.center_supply_entries (
      collection_center_id, entry_date, category_id, item_name, quantity, entry_type, created_by, created_at
    )
    select
      sr.collection_center_id,
      coalesce(sr.entry_date, sr.created_at::date),
      (select id from public.supply_categories where lower(trim(name)) = 'insumos' limit 1),
      coalesce(nullif(trim(sr.item_name), ''), 'Insumo sin detalle'),
      coalesce(sr.qty_needed, 1),
      'necesidad',
      sr.created_by,
      sr.created_at
    from public.supply_requests sr
    where not exists (
      select 1 from public.center_supply_entries e
      where e.collection_center_id = sr.collection_center_id
        and e.created_at = sr.created_at
        and e.entry_type = 'necesidad'
    );
  end if;
end $$;

create index if not exists center_supply_entries_center_idx
  on public.center_supply_entries (collection_center_id, entry_date desc);

create index if not exists center_supply_entries_category_idx
  on public.center_supply_entries (collection_center_id, category_id, entry_date desc);

-- =========================================================
-- RLS
-- =========================================================
alter table public.supply_categories enable row level security;
alter table public.center_supply_entries enable row level security;

drop policy if exists "supply_categories select" on public.supply_categories;
create policy "supply_categories select"
  on public.supply_categories for select to authenticated using (true);

drop policy if exists "supply_categories insert" on public.supply_categories;
create policy "supply_categories insert"
  on public.supply_categories for insert to authenticated with check (true);

drop policy if exists "center_supply_entries select" on public.center_supply_entries;
create policy "center_supply_entries select"
  on public.center_supply_entries for select to authenticated using (true);

drop policy if exists "center_supply_entries insert" on public.center_supply_entries;
drop policy if exists "center_supply_entries insert into" on public.center_supply_entries;
create policy "center_supply_entries insert"
  on public.center_supply_entries for insert to authenticated
  with check (created_by = auth.uid());
