begin;

select plan(5);

-- Setup users
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000001', 'farmer@test.com');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000002', 'farmer2@test.com');

insert into public.profiles (id, phone, role) values ('00000000-0000-0000-0000-000000000001', '+919999999901', 'farmer');
insert into public.profiles (id, phone, role) values ('00000000-0000-0000-0000-000000000002', '+919999999902', 'farmer');

-- Setup farmer tables
insert into public.farmers (id, verified, verification_status) values ('00000000-0000-0000-0000-000000000001', false, 'pending');
insert into public.farmers (id, verified, verification_status) values ('00000000-0000-0000-0000-000000000002', true, 'verified');

insert into public.villages (id, name, district, state) values ('00000000-0000-0000-0000-000000000001', 'Village 1', 'District 1', 'Punjab');

insert into public.plots (farmer_id, village_id, location, acres) values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', st_setsrid(st_makepoint(75.8, 30.9), 4326), 5);
insert into public.plots (farmer_id, village_id, location, acres) values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', st_setsrid(st_makepoint(75.9, 30.9), 4326), 10);

set local role authenticated;

-- Act as user 1
set local request.jwt.claim.sub to '00000000-0000-0000-0000-000000000001';

select is(
    (select count(*) from public.farmers),
    1::bigint,
    'Farmer should only see their own farmer record'
);

select is(
    (select count(*) from public.plots),
    1::bigint,
    'Farmer should only see their own plots'
);

select lives_ok(
    $$insert into public.plots (farmer_id, village_id, location, acres) values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', st_setsrid(st_makepoint(75.8, 30.9), 4326), 2)$$,
    'Farmer can insert their own plot'
);

select throws_ok(
    $$insert into public.plots (farmer_id, village_id, location, acres) values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', st_setsrid(st_makepoint(75.8, 30.9), 4326), 2)$$,
    'Farmer cannot insert plot for another farmer'
);

set local role anon;
select is(
    (select count(*) from public.farmers),
    0::bigint,
    'Anon cannot read farmers'
);

select * from finish();
rollback;
