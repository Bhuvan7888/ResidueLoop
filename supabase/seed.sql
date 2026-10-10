-- Phase 1 reference data. Test accounts must be created through Supabase Auth
-- (phone OTP) so their UUIDs, identities, and JWTs remain valid.
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
