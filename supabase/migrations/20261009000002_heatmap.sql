-- Unit 10: village-level demand and supply for the buyer heatmap.
-- Aggregated inside the database so no plot or farmer row ever leaves it.

create or replace function public.village_demand_supply()
returns table (
  village_id uuid,
  name text,
  lat double precision,
  lng double precision,
  demand_tonnes numeric,
  supply_tonnes numeric
)
language sql stable set search_path = public, extensions
as $$
  with demand as (
    select (select v.id from public.villages v order by v.geometry <-> d.location limit 1) as village_id,
           d.tonnes_needed
    from public.demand_posts d
    where d.status = 'open'
  ),
  supply as (
    select p.village_id, l.est_tonnes
    from public.listings l join public.plots p on p.id = l.plot_id
    where l.status in ('open', 'matched', 'pooled')
  )
  select v.id, v.name, st_y(v.geometry), st_x(v.geometry),
         coalesce((select sum(tonnes_needed) from demand where demand.village_id = v.id), 0),
         coalesce((select sum(est_tonnes) from supply where supply.village_id = v.id), 0)
  from public.villages v
  order by v.name;
$$;

revoke execute on function public.village_demand_supply() from public, anon, authenticated;
grant execute on function public.village_demand_supply() to service_role;
