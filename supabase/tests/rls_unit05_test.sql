BEGIN;
SELECT plan(6);

-- Setup users
INSERT INTO auth.users (id, email) VALUES
    ('11111111-1111-1111-1111-111111111111', 'farmer@test.com'),
    ('22222222-2222-2222-2222-222222222222', 'buyer@test.com'),
    ('33333333-3333-3333-3333-333333333333', 'other_buyer@test.com');

INSERT INTO public.profiles (id, full_name, phone, role) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Farmer 1', '+919999999991', 'farmer'),
    ('22222222-2222-2222-2222-222222222222', 'Buyer 1', '+919999999992', 'buyer'),
    ('33333333-3333-3333-3333-333333333333', 'Buyer 2', '+919999999993', 'buyer');

-- Setup plots and listings
INSERT INTO public.plots (id, farmer_id, name, acres, location) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Plot 1', 10, ST_SetSRID(ST_MakePoint(75.0, 30.0), 4326));

INSERT INTO public.listings (id, farmer_id, plot_id, est_tonnes, harvest_date, combine_sms_used) VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 20, '2024-10-10', true);

-- Setup buyers
INSERT INTO public.buyers (profile_id, org_name, type, location, capacity, price_per_tonne) VALUES
    ('22222222-2222-2222-2222-222222222222', 'Org 1', 'biomass', ST_SetSRID(ST_MakePoint(75.0, 30.0), 4326), 1000, 3000),
    ('33333333-3333-3333-3333-333333333333', 'Org 2', 'biomass', ST_SetSRID(ST_MakePoint(75.0, 30.0), 4326), 1000, 3000);

-- Setup balers for FK
INSERT INTO public.balers (id, name, location, daily_capacity) VALUES
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Baler 1', ST_SetSRID(ST_MakePoint(75.0, 30.0), 4326), 50);

-- Insert pool
INSERT INTO public.pools (id, village_id, buyer_id, baler_id, status, target_tonnes) VALUES
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'forming', 100);

-- Update listing with pool
UPDATE public.listings SET pool_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

-- Insert offer
INSERT INTO public.offers (id, listing_id, buyer_id, baler_id, status, price_per_tonne) VALUES
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'pending', 3000);


-- TEST 1: Farmer can see their own offers
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
SELECT results_eq(
    'SELECT id FROM public.offers',
    ARRAY['eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid],
    'Farmer can see their own offers'
);

-- TEST 2: Farmer can see their pool
SELECT results_eq(
    'SELECT id FROM public.pools',
    ARRAY['dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid],
    'Farmer can see their pool'
);

-- TEST 3: Buyer 1 can see their own offers
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
SELECT results_eq(
    'SELECT id FROM public.offers',
    ARRAY['eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid],
    'Buyer can see their own offers'
);

-- TEST 4: Buyer 1 can see their pool
SELECT results_eq(
    'SELECT id FROM public.pools',
    ARRAY['dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid],
    'Buyer can see their pool'
);

-- TEST 5: Buyer 2 cannot see Buyer 1's offers
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333"}', true);
SELECT is_empty(
    'SELECT id FROM public.offers',
    'Buyer 2 cannot see Buyer 1s offers'
);

-- TEST 6: Buyer 2 cannot see Buyer 1's pool
SELECT is_empty(
    'SELECT id FROM public.pools',
    'Buyer 2 cannot see Buyer 1s pools'
);

SELECT * FROM finish();
ROLLBACK;
