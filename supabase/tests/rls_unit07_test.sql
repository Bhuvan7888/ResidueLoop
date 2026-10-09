BEGIN;

SELECT plan(3);

-- Setup users
INSERT INTO auth.users (id, phone, role) VALUES 
('00000000-0000-0000-0000-000000000001', '+911111111111', 'authenticated'),
('00000000-0000-0000-0000-000000000002', '+912222222222', 'authenticated');

-- Setup profiles
INSERT INTO public.profiles (id, phone, role, name) VALUES 
('00000000-0000-0000-0000-000000000001', '+911111111111', 'farmer', 'Farmer 1'),
('00000000-0000-0000-0000-000000000002', '+912222222222', 'buyer', 'Buyer 1');

-- Setup farmer, village, buyer, plot
INSERT INTO public.farmers (id, profile_id) VALUES ('f0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');
INSERT INTO public.villages (id, name, district) VALUES ('v0000000-0000-0000-0000-000000000001', 'Village 1', 'District 1');
INSERT INTO public.plots (id, farmer_id, village_id, radius_m, acres) VALUES ('p0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'v0000000-0000-0000-0000-000000000001', 50, 2.0);
INSERT INTO public.buyers (id, profile_id, org_name, type) VALUES ('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Buyer 1 Org', 'biomass');
INSERT INTO public.pools (id, village_id, buyer_id, status) VALUES ('pool0000-0000-0000-0000-000000000001', 'v0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'open');

-- Insert verification
INSERT INTO public.verifications (id, plot_id, window_start, window_end, verdict) 
VALUES ('ver00000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001', '2025-10-01', '2025-11-01', 'verified');

-- Test 1: Farmer can read own verifications
SELECT auth.uid() INTO auth.jwt();
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';
SELECT results_eq(
    'SELECT id FROM public.verifications',
    ARRAY['ver00000-0000-0000-0000-000000000001'::uuid],
    'Farmer sees verification for own plot'
);

-- Test 2: Buyer can read verifications for plots in their pool village
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000002", "role": "authenticated"}';
SELECT results_eq(
    'SELECT id FROM public.verifications',
    ARRAY['ver00000-0000-0000-0000-000000000001'::uuid],
    'Buyer sees verification for plot in their assigned village pool'
);

-- Test 3: Unauthorized user sees nothing
SET LOCAL request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000003", "role": "authenticated"}';
SELECT results_eq(
    'SELECT id FROM public.verifications',
    ARRAY[]::uuid[],
    'Unauthorized user sees no verifications'
);

SELECT * FROM finish();
ROLLBACK;
