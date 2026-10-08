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

