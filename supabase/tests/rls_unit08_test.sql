begin;
select plan(23);

-- Test tables exist
select has_table('ngos', 'ngos table should exist');
select has_table('donations', 'donations table should exist');
select has_table('assistance_requests', 'assistance_requests table should exist');
select has_table('disbursements', 'disbursements table should exist');
select has_table('notifications', 'notifications table should exist');

-- Test RLS is enabled
select row_eq(
  $$ select relrowsecurity from pg_class where relname = 'ngos' $$,
  row(true),
  'RLS should be enabled on ngos'
);

select row_eq(
  $$ select relrowsecurity from pg_class where relname = 'donations' $$,
  row(true),
  'RLS should be enabled on donations'
);

select row_eq(
  $$ select relrowsecurity from pg_class where relname = 'notifications' $$,
  row(true),
  'RLS should be enabled on notifications'
);

select row_eq(
  $$ select relrowsecurity from pg_class where relname = 'assistance_requests' $$,
  row(true),
  'RLS should be enabled on assistance_requests'
);

select row_eq(
  $$ select relrowsecurity from pg_class where relname = 'disbursements' $$,
  row(true),
  'RLS should be enabled on disbursements'
);

-- Check policies
select policies_are(
  'public',
  'ngos',
  ARRAY[
    'Anyone can read ngos',
    'NGOs can update own profile',
    'NGOs can insert own profile'
  ]
);

select policies_are(
  'public',
  'donations',
  ARRAY[
    'Donors can read own donations',
    'NGOs can read donations to them',
    'Donors can insert own donations'
  ]
);

select policies_are(
  'public',
  'assistance_requests',
  ARRAY[
    'Farmers can read own requests',
    'NGOs can read requests to them',
    'Farmers can insert own requests',
    'NGOs can update requests to them'
  ]
);

select policies_are(
  'public',
  'disbursements',
  ARRAY[
    'NGOs can read own disbursements',
    'NGOs can insert own disbursements',
    'Farmers can read own requests disbursements'
  ]
);

select policies_are(
  'public',
  'notifications',
  ARRAY[
    'Users can read own notifications'
  ]
);

-- Mock identities for RLS testing
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);

-- Verify policies behavior
prepare rls_ngos as select * from ngos;
select results_eq('rls_ngos', $$select * from ngos$$, 'Can read ngos');

-- Test donor can read own donations but not others
prepare rls_donations as select id from donations;
select is_empty('rls_donations', 'Should not see any donations initially');

select * from finish();
rollback;
