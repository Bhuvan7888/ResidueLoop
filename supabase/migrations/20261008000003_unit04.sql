-- Unit 04: Buyers and listings
create type public.buyer_type as enum ('biomass', 'cbg', 'kiln', 'mill');
create type public.listing_status as enum ('open', 'matched', 'pooled', 'completed', 'cancelled');
create type public.demand_status as enum ('open', 'fulfilled', 'closed');

create table public.buyers (
    profile_id uuid references public.profiles(id) on delete cascade primary key,
    org_name text not null,
    type buyer_type not null,
    location geometry(point, 4326) not null,
    capacity bigint not null,
    price_per_tonne numeric not null,
    min_load_tonnes numeric not null default 8
);

create table public.demand_posts (
    id uuid default gen_random_uuid() primary key,
    buyer_id uuid references public.buyers(profile_id) on delete cascade not null,
    tonnes_needed numeric not null,
    price_per_tonne numeric not null,
    location geometry(point, 4326) not null,
    date_from date not null,
    date_to date not null,
    status demand_status not null default 'open',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table public.balers (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    location geometry(point, 4326) not null,
    daily_capacity numeric not null,
    availability boolean not null default true
);

create table public.listings (
    id uuid default gen_random_uuid() primary key,
    farmer_id uuid references public.profiles(id) on delete cascade not null,
    plot_id uuid references public.plots(id) on delete restrict not null,
    est_tonnes numeric not null,
    harvest_date date not null,
    combine_sms_used boolean not null,
    status listing_status not null default 'open',
    pool_id uuid, -- populated in unit 05
    source text not null default 'web',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- RLS
alter table public.buyers enable row level security;
alter table public.demand_posts enable row level security;
alter table public.balers enable row level security;
alter table public.listings enable row level security;

-- Policies for buyers
create policy "Buyers can read their own profile" on public.buyers for select using (auth.uid() = profile_id);
create policy "Buyers can insert their own profile" on public.buyers for insert with check (auth.uid() = profile_id);
create policy "Buyers can update their own profile" on public.buyers for update using (auth.uid() = profile_id);

-- Policies for demand posts
create policy "Buyers can read their own demand posts" on public.demand_posts for select using (auth.uid() = buyer_id);
create policy "Buyers can insert their own demand posts" on public.demand_posts for insert with check (auth.uid() = buyer_id);
create policy "Buyers can update their own demand posts" on public.demand_posts for update using (auth.uid() = buyer_id);

-- Policies for balers (seeded, no login)
-- Only service role can write. Anyone authenticated can read (for matching).
create policy "Authenticated can read balers" on public.balers for select using (auth.role() = 'authenticated');

-- Policies for listings
create policy "Farmers can read their own listings" on public.listings for select using (auth.uid() = farmer_id);
create policy "Farmers can insert their own listings" on public.listings for insert with check (auth.uid() = farmer_id);
create policy "Farmers can update their own listings" on public.listings for update using (auth.uid() = farmer_id);
