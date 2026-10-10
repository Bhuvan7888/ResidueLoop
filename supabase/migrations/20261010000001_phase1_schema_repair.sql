-- Phase 1 recovery for the hosted project. This migration is forward-only: it
-- completes tables that were absent from the deployed schema and enforces the
-- API-only mutation boundary described in architecture-context.md.
create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public)
values ('id-documents', 'id-documents', false)
on conflict (id) do update set public = false;

do $$
begin
  if not exists (
    select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'verification_verdict'
  ) then
    create type public.verification_verdict as enum ('verified', 'fire_detected', 'inconclusive');
  end if;
end;
$$;

create table if not exists public.pools (
  id uuid primary key default gen_random_uuid(),
  village_id uuid not null references public.villages(id),
  buyer_id uuid not null references public.buyers(profile_id),
  baler_id uuid not null references public.balers(id),
  status text not null default 'forming' check (status in ('forming', 'ready', 'in_progress', 'completed')),
  target_tonnes numeric not null check (target_tonnes > 0),
  current_tonnes numeric not null default 0 check (current_tonnes >= 0),
  pickup_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listings add column if not exists pool_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'listings_pool_id_fkey'
  ) then
    alter table public.listings
      add constraint listings_pool_id_fkey foreign key (pool_id) references public.pools(id);
  end if;
end;
$$;

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  pool_id uuid references public.pools(id),
  buyer_id uuid not null references public.buyers(profile_id),
  baler_id uuid not null references public.balers(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  price_per_tonne numeric not null check (price_per_tonne > 0),
  pickup_start date,
  pickup_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists offers_one_pending_per_listing_idx
  on public.offers (listing_id) where status = 'pending';

create table if not exists public.pickups (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.pools(id),
  listing_id uuid not null references public.listings(id),
  baler_id uuid references public.balers(id),
  actual_tonnes numeric check (actual_tonnes >= 0),
  amount_due numeric check (amount_due >= 0),
  quality_notes text,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'received', 'not_received')),
  payment_updated_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id)
);

create table if not exists public.verifications (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots(id) on delete cascade,
  window_start date not null,
  window_end date not null,
  firms_hits integer not null default 0 check (firms_hits >= 0),
  nbr_delta numeric,
  verdict public.verification_verdict not null,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ngos add column if not exists name text;
alter table public.ngos add column if not exists region text;
alter table public.ngos add column if not exists status text not null default 'active';
alter table public.disbursements add column if not exists donation_id uuid references public.donations(id);
alter table public.disbursements add column if not exists payee_type text;
alter table public.disbursements add column if not exists note text;
alter table public.pickups add column if not exists baler_id uuid references public.balers(id);
alter table public.pickups add column if not exists quality_notes text;
alter table public.pickups add column if not exists completed_at timestamptz;
alter table public.pickups add column if not exists payment_updated_at timestamptz;

create index if not exists pools_buyer_id_idx on public.pools (buyer_id);
create index if not exists pools_village_id_idx on public.pools (village_id);
create index if not exists offers_buyer_id_idx on public.offers (buyer_id);
create index if not exists pickups_pool_id_idx on public.pickups (pool_id);
create index if not exists verifications_plot_id_idx on public.verifications (plot_id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['pools', 'offers', 'pickups', 'verifications']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    if not exists (
      select 1 from pg_trigger
      where tgname = format('handle_updated_at_%s', table_name)
    ) then
      execute format(
        'create trigger handle_updated_at_%1$s before update on public.%1$I for each row execute procedure public.handle_updated_at()',
        table_name
      );
    end if;
  end loop;
end;
$$;

-- The browser reads through RLS. All mutations are performed by FastAPI with
-- the service role after role and ownership checks.
drop policy if exists "Users can update own farmer profile" on public.farmers;
drop policy if exists "Users can insert own farmer profile" on public.farmers;
drop policy if exists "Users can update own plots" on public.plots;
drop policy if exists "Users can insert own plots" on public.plots;
drop policy if exists "Users can insert own id_verifications" on public.id_verifications;
drop policy if exists "Users can upload their own id documents" on storage.objects;
drop policy if exists "Buyers can insert their own profile" on public.buyers;
drop policy if exists "Buyers can update their own profile" on public.buyers;
drop policy if exists "Buyers can insert their own demand posts" on public.demand_posts;
drop policy if exists "Buyers can update their own demand posts" on public.demand_posts;
drop policy if exists "Farmers can insert their own listings" on public.listings;
drop policy if exists "Farmers can update their own listings" on public.listings;
drop policy if exists "Farmers can update own offers" on public.offers;
drop policy if exists "Farmers can see own offers" on public.offers;
drop policy if exists "Buyers see own offers" on public.offers;
drop policy if exists "Anyone in pool can see pool" on public.pools;
drop policy if exists "Farmers can see and update their own pickups payment" on public.pickups;
drop policy if exists "Buyers can see and update their pool pickups" on public.pickups;
drop policy if exists "Farmers can read own verifications" on public.verifications;
drop policy if exists "Buyers can read village verifications for their pools" on public.verifications;

create policy "Farmers read own offers" on public.offers for select to authenticated using (
  exists (
    select 1 from public.listings where listings.id = offers.listing_id and listings.farmer_id = auth.uid()
  )
);
create policy "Buyers read own offers" on public.offers for select to authenticated using (buyer_id = auth.uid());
create policy "Farmers read own pools" on public.pools for select to authenticated using (
  exists (
    select 1 from public.listings where listings.pool_id = pools.id and listings.farmer_id = auth.uid()
  )
);
create policy "Buyers read own pools" on public.pools for select to authenticated using (buyer_id = auth.uid());
create policy "Farmers read own pickups" on public.pickups for select to authenticated using (
  exists (
    select 1 from public.listings where listings.id = pickups.listing_id and listings.farmer_id = auth.uid()
  )
);
create policy "Buyers read own pickups" on public.pickups for select to authenticated using (
  exists (
    select 1 from public.pools where pools.id = pickups.pool_id and pools.buyer_id = auth.uid()
  )
);
create policy "Farmers read own verifications" on public.verifications for select to authenticated using (
  exists (
    select 1 from public.plots where plots.id = verifications.plot_id and plots.farmer_id = auth.uid()
  )
);
create policy "Buyers read pool village verifications" on public.verifications for select to authenticated using (
  exists (
    select 1
    from public.plots
    join public.pools on pools.village_id = plots.village_id
    where plots.id = verifications.plot_id and pools.buyer_id = auth.uid()
  )
);

-- Reference data is safe to seed before test accounts exist. Auth users and
-- their profiles are created through the hosted Supabase Auth flow, never with
-- raw inserts into auth.users.
insert into public.villages (id, name, district, geometry, paddy_area_est)
values
  ('11111111-1111-1111-1111-111111111111', 'Badhni Kalan', 'Moga', st_setsrid(st_makepoint(75.171, 30.820), 4326), 1200),
  ('11111111-1111-1111-1111-111111111112', 'Ajitwal', 'Moga', st_setsrid(st_makepoint(75.210, 30.811), 4326), 900),
  ('11111111-1111-1111-1111-111111111113', 'Dharamkot', 'Moga', st_setsrid(st_makepoint(75.236, 30.944), 4326), 1050)
on conflict (id) do update set name = excluded.name, district = excluded.district;

insert into public.balers (id, name, location, daily_capacity, availability)
values
  ('33333333-3333-3333-3333-333333333331', 'Moga Straw Services', st_setsrid(st_makepoint(75.175, 30.825), 4326), 24, true),
  ('33333333-3333-3333-3333-333333333332', 'Punjab Bale Co-op', st_setsrid(st_makepoint(75.220, 30.850), 4326), 18, true)
on conflict (id) do update set name = excluded.name, daily_capacity = excluded.daily_capacity, availability = excluded.availability;
