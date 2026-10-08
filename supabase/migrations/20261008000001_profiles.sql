-- Create enum for roles
create type public.user_role as enum ('farmer', 'buyer', 'donor', 'ngo');

-- Create profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  phone text unique not null check (phone ~ '^\+91\d{10}$'),
  role public.user_role not null,
  name text,
  language text default 'en',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table public.profiles enable row level security;

-- Set up updated_at trigger
create trigger handle_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- RLS Policies
-- Users can read their own profile
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- No insert or delete policies. Insert happens via service_role/trigger on auth.users creation, or users insert their own profile at role selection?
-- The spec says: "Role is saved once and cannot be changed".
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);
