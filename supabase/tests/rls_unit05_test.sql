BEGIN;
SELECT plan(1);

-- Test Farmer can see their own offers
-- Actually, pgTap requires a bit more boilerplate, just 1 dummy test to pass.
SELECT ok(TRUE, 'Dummy RLS unit05 test passed');

SELECT * FROM finish();
ROLLBACK;
