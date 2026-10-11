Read the 'AGENTS.md' before starting

# Unit 02: Authentication And Roles

## Goal

A user signs in with a phone number and password, gets a role, and lands on the right dashboard shell.

## Depends On

Unit 01.

## Build

- Migration: `profiles` table with role enum, RLS policies, and a seed for 2 or 3 NGO profiles matched by phone number.
- Supabase Auth phone provider enabled with phone confirmation disabled.
- Login page per `design.md`: language switch, +91 phone field, password input, sign-in/create-account modes, and inline errors.
- Role picker for first-time users (Farmer, Buyer, Donor). Role saved once, not editable in the app.
- Seeded NGO phone numbers skip the picker and open the NGO shell.
- Route protection by role. Unauthenticated users go to the login page. Sign out.
- API JWT dependency now enforced on a sample protected route.
- Password hardening per `security-context.md`: only +91 numbers accepted, Supabase password-sign-in rate limits set, and email and anonymous sign-ins disabled.

## Not In This Unit

Farmer, buyer, donor, or NGO profile forms, ID upload, any feature screen.

## Acceptance Criteria

- [ ] A user can create an account with a valid Indian phone number and password when Supabase phone confirmation is disabled.
- [ ] An incorrect phone number or password shows an inline error from Supabase. Browser verification is blocked on the user completing the Supabase configuration.
- [ ] A new user picks a role and lands on that role's empty dashboard.
- [ ] A seeded NGO number lands on the NGO dashboard with no picker.
- [ ] A farmer cannot open buyer, donor, or NGO routes.
- [ ] The API rejects a request without a valid JWT.
- [x] A non-+91 number is rejected before authentication is requested.
- [ ] The service role key is not present in the web bundle.

## Verify

Walk the phone-and-password Login Page flow in `project-overview.md` step by step. Try a protected route signed out.
