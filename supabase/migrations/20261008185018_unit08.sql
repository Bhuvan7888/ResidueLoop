create table public.ngos (
  profile_id uuid references public.profiles(id) not null primary key,
  description text,
  website_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.donations (
  id uuid default gen_random_uuid() primary key,
  donor_id uuid references public.profiles(id) not null,
  ngo_id uuid references public.ngos(profile_id) not null,
  amount numeric not null check (amount > 0),
  target_village_id uuid references public.villages(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create type public.assistance_request_status as enum ('pending', 'approved', 'declined');

create table public.assistance_requests (
  id uuid default gen_random_uuid() primary key,
  farmer_id uuid references public.farmers(profile_id) not null,
  ngo_id uuid references public.ngos(profile_id) not null,
  listing_id uuid references public.listings(id) not null,
  amount_requested numeric not null check (amount_requested > 0),
  purpose text not null,
  status public.assistance_request_status default 'pending' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.disbursements (
  id uuid default gen_random_uuid() primary key,
  request_id uuid references public.assistance_requests(id) not null,
  ngo_id uuid references public.ngos(profile_id) not null,
  payee_name text not null,
  amount numeric not null check (amount > 0),
  disbursed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) not null,
  message text not null,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table public.ngos enable row level security;
alter table public.donations enable row level security;
alter table public.assistance_requests enable row level security;
alter table public.disbursements enable row level security;
alter table public.notifications enable row level security;

-- Updated at triggers
create trigger handle_updated_at before update on public.assistance_requests
  for each row execute procedure public.handle_updated_at();

-- RLS Policies

-- NGOs: anyone can read ngos
create policy "Anyone can read ngos" on public.ngos for select using (true);
create policy "NGOs can update own profile" on public.ngos for update using (auth.uid() = profile_id);
create policy "NGOs can insert own profile" on public.ngos for insert with check (auth.uid() = profile_id);

-- Donations: donors can read own, ngos can read donations to them
create policy "Donors can read own donations" on public.donations
  for select using (auth.uid() = donor_id);
create policy "NGOs can read donations to them" on public.donations
  for select using (auth.uid() = ngo_id);
create policy "Donors can insert own donations" on public.donations
  for insert with check (auth.uid() = donor_id);

-- Assistance Requests: farmers can read own, ngos can read requests to them
create policy "Farmers can read own requests" on public.assistance_requests
  for select using (auth.uid() = farmer_id);
create policy "NGOs can read requests to them" on public.assistance_requests
  for select using (auth.uid() = ngo_id);
create policy "Farmers can insert own requests" on public.assistance_requests
  for insert with check (auth.uid() = farmer_id);
create policy "NGOs can update requests to them" on public.assistance_requests
  for update using (auth.uid() = ngo_id);

-- Disbursements: ngos can read/insert own, farmers can read own requests' disbursements
create policy "NGOs can read own disbursements" on public.disbursements
  for select using (auth.uid() = ngo_id);
create policy "NGOs can insert own disbursements" on public.disbursements
  for insert with check (auth.uid() = ngo_id);
create policy "Farmers can read own requests disbursements" on public.disbursements
  for select using (
    request_id in (select id from public.assistance_requests where farmer_id = auth.uid())
  );

-- Notifications: users can read own
create policy "Users can read own notifications" on public.notifications
  for select using (auth.uid() = profile_id);
