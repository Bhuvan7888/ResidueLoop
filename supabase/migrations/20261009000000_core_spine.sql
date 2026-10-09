-- Core spine: align offers, pools and pickups with the specs, add indexes,
-- and close direct-write holes. Business writes go through the API (service role).

-- Offers: pickup window shown to the farmer (architecture-context data model).
alter table public.offers
  add column pickup_start timestamptz,
  add column pickup_end timestamptz;

-- Pools: tie the village to the villages table.
alter table public.pools
  add constraint pools_village_id_fkey foreign key (village_id) references public.villages(id);

-- Pickups: one row per farmer listing, weights and payment status per farmer.
alter table public.pickups rename column actual_tonnes to weighed_tonnes;
alter table public.pickups
  add column payment_updated_at timestamptz,
  add column quality_notes text,
  add column completed_at timestamptz,
  add constraint pickups_listing_id_key unique (listing_id);

alter table public.listings
  add constraint listings_source_check check (source in ('web', 'whatsapp'));

-- Indexes on every foreign key used by the services.
create index if not exists plots_farmer_id_idx on public.plots (farmer_id);
create index if not exists listings_farmer_id_idx on public.listings (farmer_id);
create index if not exists listings_plot_id_idx on public.listings (plot_id);
create index if not exists listings_pool_id_idx on public.listings (pool_id);
create index if not exists offers_listing_id_idx on public.offers (listing_id);
create index if not exists offers_buyer_id_idx on public.offers (buyer_id);
create index if not exists pools_village_id_idx on public.pools (village_id);
create index if not exists pools_buyer_id_idx on public.pools (buyer_id);
create index if not exists pickups_pool_id_idx on public.pickups (pool_id);

-- Helper used by policies. Security definer avoids an RLS loop between pools and listings.
create or replace function public.buyer_owns_pool(p_pool_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.pools where id = p_pool_id and buyer_id = auth.uid());
$$;

-- Access table: buyers read listings that belong to their own pools.
create policy "Buyers read listings in own pools" on public.listings
  for select using (public.buyer_owns_pool(pool_id));

-- Close direct-write holes. The API writes with the service role after its own checks.
drop policy "Farmers can insert their own listings" on public.listings;
drop policy "Farmers can update their own listings" on public.listings;
drop policy "Farmers can update own offers" on public.offers;
drop policy "Farmers can see and update their own pickups payment" on public.pickups;
drop policy "Buyers can see and update their pool pickups" on public.pickups;

create policy "Farmers read own pickups" on public.pickups
  for select using (listing_id in (select id from public.listings where farmer_id = auth.uid()));
create policy "Buyers read pool pickups" on public.pickups
  for select using (public.buyer_owns_pool(pool_id));

-- A farmer must not set their own verification state from the browser.
revoke insert, update on public.farmers from anon, authenticated;
grant insert (profile_id, village_id) on public.farmers to authenticated;
grant update (village_id) on public.farmers to authenticated;
revoke insert, update on public.id_verifications from anon, authenticated;

-- Matching input: buyers and balers with the distance from the listing's plot.
create or replace function public.listing_match_candidates(p_listing_id uuid)
returns table (
  kind text,
  id uuid,
  price_per_tonne numeric,
  capacity numeric,
  min_load_tonnes numeric,
  distance_km double precision
)
language sql stable set search_path = public, extensions
as $$
  with src as (
    select p.centre as c
    from public.listings l join public.plots p on p.id = l.plot_id
    where l.id = p_listing_id
  )
  select 'buyer'::text, b.profile_id, b.price_per_tonne, b.capacity::numeric, b.min_load_tonnes,
         st_distance(b.location::geography, src.c::geography) / 1000
  from public.buyers b, src
  union all
  select 'baler'::text, bl.id, null::numeric, bl.daily_capacity, null::numeric,
         st_distance(bl.location::geography, src.c::geography) / 1000
  from public.balers bl, src
  where bl.availability;
$$;

revoke execute on function public.listing_match_candidates(uuid) from public, anon, authenticated;
grant execute on function public.listing_match_candidates(uuid) to service_role;
