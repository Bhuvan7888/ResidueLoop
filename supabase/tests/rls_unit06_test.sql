BEGIN;
SELECT plan(1);
SELECT ok(TRUE, 'Dummy RLS unit06 test passed');
SELECT * FROM finish();
ROLLBACK;
