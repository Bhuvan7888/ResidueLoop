begin;

select plan(5);

-- Test profiles RLS
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000001', 'farmer@test.com');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000002', 'buyer@test.com');

insert into public.profiles (id, phone, role) values ('00000000-0000-0000-0000-000000000001', '+919999999901', 'farmer');
insert into public.profiles (id, phone, role) values ('00000000-0000-0000-0000-000000000002', '+919999999902', 'buyer');

set local role authenticated;

-- Act as user 1
set local request.jwt.claim.sub to '00000000-0000-0000-0000-000000000001';
select is(
    (select count(*) from public.profiles),
    1::bigint,
    'User should only see their own profile'
);

select results_eq(
    'select id from public.profiles',
    $$values ('00000000-0000-0000-0000-000000000001'::uuid)$$,
    'User 1 sees user 1 profile'
);

select lives_ok(
    $$update public.profiles set name = 'New Name' where id = '00000000-0000-0000-0000-000000000001'$$,
    'User can update own profile'
);

select throws_ok(
    $$update public.profiles set name = 'Hacked' where id = '00000000-0000-0000-0000-000000000002'$$,
    'User cannot update other profile'
);

-- Act as anon
set local role anon;
select is(
    (select count(*) from public.profiles),
    0::bigint,
    'Anon cannot read profiles'
);

select * from finish();
rollback;
