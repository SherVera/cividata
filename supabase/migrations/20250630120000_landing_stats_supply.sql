-- Actualiza landing_stats: de contadores de pacientes → necesidades abiertas de insumos.
-- Necesario si la DB tenía una versión anterior de landing_stats().

create or replace function public.landing_stats()
returns json language sql security definer set search_path = public stable as $$
  with balances as (
    select
      e.collection_center_id,
      e.category_id,
      min(trim(e.item_name)) as item_name,
      sum(case when e.entry_type = 'necesidad' then e.quantity else 0 end) as needed,
      sum(case when e.entry_type = 'recepcion' then e.quantity else 0 end) as received
    from center_supply_entries e
    group by e.collection_center_id, e.category_id, lower(trim(e.item_name))
  ),
  open_rows as (
    select
      b.collection_center_id,
      b.category_id,
      b.item_name,
      b.needed,
      b.received,
      b.needed - b.received as balance,
      cc.name as collection_center_name,
      coalesce(sc.name, 'Insumos') as category_name
    from balances b
    inner join collection_centers cc on cc.id = b.collection_center_id
    left join supply_categories sc on sc.id = b.category_id
    where b.needed - b.received > 0
      and cc.active is distinct from false
  )
  select json_build_object(
    'collection_centers', (
      select count(*)::int from collection_centers where active is distinct from false
    ),
    'open_items', (select count(*)::int from open_rows),
    'pending_units', (select coalesce(sum(balance), 0)::numeric from open_rows),
    'centers_with_needs', (select count(distinct collection_center_id)::int from open_rows),
    'needs', coalesce(
      (
        select json_agg(
          json_build_object(
            'collection_center_id', collection_center_id,
            'collection_center_name', collection_center_name,
            'category_id', category_id,
            'category_name', category_name,
            'item_name', item_name,
            'needed', needed,
            'received', received,
            'balance', balance
          )
          order by balance desc, collection_center_name, item_name
        )
        from open_rows
      ),
      '[]'::json
    )
  );
$$;

grant execute on function public.landing_stats() to anon, authenticated;

insert into public.schema_migrations (version, name, notes)
values (
  '20250630120000',
  'landing_stats_supply',
  'Landing pública: necesidades abiertas de insumos por centro'
)
on conflict (version) do nothing;
