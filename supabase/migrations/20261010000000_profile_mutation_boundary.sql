-- Role creation is performed only by POST /api/v1/profiles with the service
-- role after validating the caller's JWT. Keeping browser write policies here
-- would allow a signed-in client to bypass that invariant.
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
