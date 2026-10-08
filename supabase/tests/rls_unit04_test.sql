begin;
select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000001', 'b1@test.com');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000002', 'b2@test.com');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000003', 'f1@test.com');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000004', 'f2@test.com');

insert into public.profiles (id, phone, role) values ('00000000-0000-0000-0000-000000000001', '+919999999901', 'buyer');
insert into public.profiles (id, phone, role) values ('00000000-0000-0000-0000-000000000002', '+919999999902', 'buyer');
insert into public.profiles (id, phone, role) values ('00000000-0000-0000-0000-000000000003', '+919999999903', 'farmer');
insert into public.profiles (id, phone, role) values ('00000000-0000-0000-0000-000000000004', '+919999999904', 'farmer');

insert into public.buyers (profile_id, org_name, type, location, capacity, price_per_tonne, min_load_tonnes)
values ('00000000-0000-0000-0000-000000000001', 'O1', 'cbg', st_setsrid(st_makepoint(0,0), 4326), 1, 1, 8);

insert into public.buyers (profile_id, org_name, type, location, capacity, price_per_tonne, min_load_tonnes)
values ('00000000-0000-0000-0000-000000000002', 'O2', 'cbg', st_setsrid(st_makepoint(0,0), 4326), 1, 1, 8);

insert into public.villages (id, name, district, state) values ('00000000-0000-0000-0000-000000000001', 'V1', 'D1', 'S1');
insert into public.plots (id, farmer_id, village_id, location, acres) values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', st_setsrid(st_makepoint(0,0), 4326), 5);
insert into public.listings (id, farmer_id, plot_id, est_tonnes, harvest_date, combine_sms_used) values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 10, '2026-10-01', true);

set local role authenticated;

-- Act as buyer 1
set local request.jwt.claim.sub to '00000000-0000-0000-0000-000000000001';
select results_eq(
    'select count(*) from public.buyers',
    $$values (1::bigint)$$,
    'Buyer can only read their own buyer profile'
);
select lives_ok(
    $$insert into public.demand_posts (buyer_id, tonnes_needed, price_per_tonne, location, date_from, date_to) values ('00000000-0000-0000-0000-000000000001', 10, 100, st_setsrid(st_makepoint(0,0), 4326), '2026-10-01', '2026-10-31')$$,
    'Buyer can insert demand post for themselves'
);
select throws_ok(
    $$insert into public.demand_posts (buyer_id, tonnes_needed, price_per_tonne, location, date_from, date_to) values ('00000000-0000-0000-0000-000000000002', 10, 100, st_setsrid(st_makepoint(0,0), 4326), '2026-10-01', '2026-10-31')$$,
    'Buyer cannot insert demand post for another buyer'
);

-- Act as farmer 3
set local request.jwt.claim.sub to '00000000-0000-0000-0000-000000000003';
select results_eq(
    'select count(*) from public.listings',
    $$values (1::bigint)$$,
    'Farmer can only read their own listings'
);
select lives_ok(
    $$insert into public.listings (farmer_id, plot_id, est_tonnes, harvest_date, combine_sms_used) values ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 5, '2026-10-02', false)$$,
    'Farmer can insert listing for themselves'
);
select throws_ok(
    $$insert into public.listings (farmer_id, plot_id, est_tonnes, harvest_date, combine_sms_used) values ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 5, '2026-10-02', false)$$,
    'Farmer cannot insert listing for another farmer'
);

set local role anon;
select results_eq(
    'select count(*) from public.buyers',
    $$values (0::bigint)$$,
    'Anon cannot read buyers'
);

select * from finish();
rollback;
