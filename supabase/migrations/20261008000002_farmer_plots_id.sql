-- Enable PostGIS if not already enabled (done in init)

create type public.id_status as enum ('not_submitted', 'pending', 'verified', 'rejected');

create table public.villages (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  district text not null,
  geometry geometry(Point, 4326),
  paddy_area_est numeric
);

create table public.farmers (
  profile_id uuid references public.profiles(id) not null primary key,
  village_id uuid references public.villages(id),
  id_status public.id_status default 'not_submitted' not null,
  trust_score integer default 0
);

create table public.plots (
  id uuid default gen_random_uuid() primary key,
  farmer_id uuid references public.farmers(profile_id) not null,
  village_id uuid references public.villages(id) not null,
  centre geometry(Point, 4326) not null,
  radius_m numeric,
  acres numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.id_verifications (
  id uuid default gen_random_uuid() primary key,
  farmer_id uuid references public.farmers(profile_id) not null,
  id_type text not null,
  id_last4 text not null,
  document_path text not null,
  status public.id_status default 'pending' not null,
  rejection_reason text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table public.villages enable row level security;
alter table public.farmers enable row level security;
alter table public.plots enable row level security;
alter table public.id_verifications enable row level security;

-- Updated at triggers
create trigger handle_updated_at before update on public.plots
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.id_verifications
  for each row execute procedure public.handle_updated_at();

-- RLS Policies

-- Villages: anyone can read
create policy "Anyone can read villages" on public.villages for select using (true);

-- Farmers: own read/update
create policy "Users can read own farmer profile" on public.farmers
  for select using (auth.uid() = profile_id);
create policy "Users can update own farmer profile" on public.farmers
  for update using (auth.uid() = profile_id);
create policy "Users can insert own farmer profile" on public.farmers
  for insert with check (auth.uid() = profile_id);

-- Plots: own read/update/insert
create policy "Users can read own plots" on public.plots
  for select using (auth.uid() = farmer_id);
create policy "Users can update own plots" on public.plots
  for update using (auth.uid() = farmer_id);
create policy "Users can insert own plots" on public.plots
  for insert with check (auth.uid() = farmer_id);

-- ID Verifications: own read
create policy "Users can read own id_verifications" on public.id_verifications
  for select using (auth.uid() = farmer_id);
-- Insert/Update is done via the API service role, but allowing user insert is also fine if path is checked, but API will do it.
create policy "Users can insert own id_verifications" on public.id_verifications
  for insert with check (auth.uid() = farmer_id);

-- Storage bucket for id-documents (Needs to be created by API or seed)
insert into storage.buckets (id, name, public) values ('id-documents', 'id-documents', false) on conflict do nothing;

create policy "Users can upload their own id documents"
  on storage.objects for insert
  with check ( bucket_id = 'id-documents' and (storage.foldername(name))[1] = auth.uid()::text );
