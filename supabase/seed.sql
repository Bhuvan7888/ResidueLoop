-- Seed NGO profiles
-- Note: auth.users needs to exist first for FK constraints. We insert into auth.users then profiles.

insert into auth.users (id, phone, role, aud, confirmation_token)
values 
  ('00000000-0000-0000-0000-000000000001', '+919999999991', 'authenticated', 'authenticated', ''),
  ('00000000-0000-0000-0000-000000000002', '+919999999992', 'authenticated', 'authenticated', '')
on conflict do nothing;

insert into public.profiles (id, phone, role, name, language)
values 
  ('00000000-0000-0000-0000-000000000001', '+919999999991', 'ngo', 'Test NGO 1', 'en'),
  ('00000000-0000-0000-0000-000000000002', '+919999999992', 'ngo', 'Test NGO 2', 'en')
on conflict do nothing;

-- Seed Villages in Moga district
insert into public.villages (id, name, district, geometry) values
  ('11111111-1111-1111-1111-111111111111', 'Demo Village 1', 'Moga', ST_SetSRID(ST_MakePoint(75.17, 30.82), 4326)),
  ('11111111-1111-1111-1111-111111111112', 'Demo Village 2', 'Moga', ST_SetSRID(ST_MakePoint(75.18, 30.83), 4326)),
  ('11111111-1111-1111-1111-111111111113', 'Demo Village 3', 'Moga', ST_SetSRID(ST_MakePoint(75.19, 30.84), 4326)),
  ('11111111-1111-1111-1111-111111111114', 'Demo Village 4', 'Moga', ST_SetSRID(ST_MakePoint(75.20, 30.85), 4326)),
  ('11111111-1111-1111-1111-111111111115', 'Demo Village 5', 'Moga', ST_SetSRID(ST_MakePoint(75.21, 30.86), 4326)),
  ('11111111-1111-1111-1111-111111111116', 'Demo Village 6', 'Moga', ST_SetSRID(ST_MakePoint(75.22, 30.87), 4326)),
  ('11111111-1111-1111-1111-111111111117', 'Demo Village 7', 'Moga', ST_SetSRID(ST_MakePoint(75.23, 30.88), 4326)),
  ('11111111-1111-1111-1111-111111111118', 'Demo Village 8', 'Moga', ST_SetSRID(ST_MakePoint(75.24, 30.89), 4326)),
  ('11111111-1111-1111-1111-111111111119', 'Demo Village 9', 'Moga', ST_SetSRID(ST_MakePoint(75.25, 30.90), 4326)),
  ('11111111-1111-1111-1111-11111111111a', 'Demo Village 10', 'Moga', ST_SetSRID(ST_MakePoint(75.26, 30.91), 4326))
on conflict do nothing;

-- Seed Buyers
insert into auth.users (id, phone, role, aud, confirmation_token)
values 
  ('22222222-2222-2222-2222-222222222221', '+919999999981', 'authenticated', 'authenticated', ''),
  ('22222222-2222-2222-2222-222222222222', '+919999999982', 'authenticated', 'authenticated', ''),
  ('22222222-2222-2222-2222-222222222223', '+919999999983', 'authenticated', 'authenticated', ''),
  ('22222222-2222-2222-2222-222222222224', '+919999999984', 'authenticated', 'authenticated', ''),
  ('22222222-2222-2222-2222-222222222225', '+919999999985', 'authenticated', 'authenticated', '')
on conflict do nothing;

insert into public.profiles (id, phone, role, name, language)
values 
  ('22222222-2222-2222-2222-222222222221', '+919999999981', 'buyer', 'Demo Buyer 1', 'en'),
  ('22222222-2222-2222-2222-222222222222', '+919999999982', 'buyer', 'Demo Buyer 2', 'en'),
  ('22222222-2222-2222-2222-222222222223', '+919999999983', 'buyer', 'Demo Buyer 3', 'en'),
  ('22222222-2222-2222-2222-222222222224', '+919999999984', 'buyer', 'Demo Buyer 4', 'en'),
  ('22222222-2222-2222-2222-222222222225', '+919999999985', 'buyer', 'Demo Buyer 5', 'en')
on conflict do nothing;

insert into public.buyers (profile_id, org_name, type, location, capacity, price_per_tonne, min_load_tonnes)
values 
  ('22222222-2222-2222-2222-222222222221', 'Biomass Plant 1', 'biomass', ST_SetSRID(ST_MakePoint(75.1, 30.8), 4326), 10000, 1800, 8),
  ('22222222-2222-2222-2222-222222222222', 'CBG Plant 1', 'cbg', ST_SetSRID(ST_MakePoint(75.3, 30.9), 4326), 5000, 1900, 8),
  ('22222222-2222-2222-2222-222222222223', 'Kiln 1', 'kiln', ST_SetSRID(ST_MakePoint(75.2, 30.7), 4326), 2000, 1750, 8),
  ('22222222-2222-2222-2222-222222222224', 'Mill 1', 'mill', ST_SetSRID(ST_MakePoint(75.15, 30.85), 4326), 1000, 1700, 8),
  ('22222222-2222-2222-2222-222222222225', 'CBG Plant 2', 'cbg', ST_SetSRID(ST_MakePoint(75.25, 30.95), 4326), 6000, 1950, 8)
on conflict do nothing;

-- Seed Balers
insert into public.balers (id, name, location, daily_capacity, availability)
values 
  ('33333333-3333-3333-3333-333333333331', 'Baler 1 (Demo)', ST_SetSRID(ST_MakePoint(75.11, 30.81), 4326), 20, true),
  ('33333333-3333-3333-3333-333333333332', 'Baler 2 (Demo)', ST_SetSRID(ST_MakePoint(75.12, 30.82), 4326), 25, true),
  ('33333333-3333-3333-3333-333333333333', 'Baler 3 (Demo)', ST_SetSRID(ST_MakePoint(75.13, 30.83), 4326), 30, true),
  ('33333333-3333-3333-3333-333333333334', 'Baler 4 (Demo)', ST_SetSRID(ST_MakePoint(75.14, 30.84), 4326), 20, true),
  ('33333333-3333-3333-3333-333333333335', 'Baler 5 (Demo)', ST_SetSRID(ST_MakePoint(75.15, 30.85), 4326), 25, true)
on conflict do nothing;

-- Seed open demand for the heatmap (Moga demo district, labelled demo data).
insert into public.demand_posts (id, buyer_id, tonnes_needed, price_per_tonne, location, date_from, date_to, status)
values
  ('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222221', 40, 1800, ST_SetSRID(ST_MakePoint(75.19, 30.84), 4326), '2026-10-15', '2026-11-05', 'open'),
  ('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', 25, 1900, ST_SetSRID(ST_MakePoint(75.23, 30.88), 4326), '2026-10-15', '2026-11-05', 'open'),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222223', 12, 1750, ST_SetSRID(ST_MakePoint(75.17, 30.82), 4326), '2026-10-18', '2026-11-08', 'open'),
  ('33333333-3333-3333-3333-333333333334', '22222222-2222-2222-2222-222222222224', 18, 1700, ST_SetSRID(ST_MakePoint(75.21, 30.86), 4326), '2026-10-18', '2026-11-08', 'open'),
  ('33333333-3333-3333-3333-333333333335', '22222222-2222-2222-2222-222222222225', 30, 1950, ST_SetSRID(ST_MakePoint(75.25, 30.90), 4326), '2026-10-20', '2026-11-10', 'open')
on conflict do nothing;
