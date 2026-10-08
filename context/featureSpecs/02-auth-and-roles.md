Read the 'AGENTS.md' before starting

# Unit 02: Authentication And Roles

## Goal

A user signs in with a phone number OTP, gets a role, and lands on the right dashboard shell.

## Depends On

Unit 01.

## Build

- Migration: `profiles` table with role enum, RLS policies, and a seed for 2 or 3 NGO profiles matched by phone number.
- Supabase Auth phone provider enabled with test phone numbers and fixed OTPs.
- Login page per `design.md`: language switch, +91 phone field, OTP input, resend countdown, inline errors.
- Role picker for first-time users (Farmer, Buyer, Donor). Role saved once, not editable in the app.
- Seeded NGO phone numbers skip the picker and open the NGO shell.
- Route protection by role. Unauthenticated users go to the login page. Sign out.
- API JWT dependency now enforced on a sample protected route.
- OTP abuse protection per `security-context.md`: only +91 numbers accepted, CAPTCHA on OTP request, Supabase SMS and verification rate limits set, email and anonymous sign-ins disabled.

## Not In This Unit

Farmer, buyer, donor, or NGO profile forms, ID upload, any feature screen.

## Acceptance Criteria

- [ ] A test phone number signs in with its fixed OTP.
- [ ] Wrong OTP shows an error. Expired OTP offers resend. Resend is blocked during the cooldown.
- [ ] A new user picks a role and lands on that role's empty dashboard.
- [ ] A seeded NGO number lands on the NGO dashboard with no picker.
- [ ] A farmer cannot open buyer, donor, or NGO routes.
- [ ] The API rejects a request without a valid JWT.
- [ ] A non-+91 number is rejected before any SMS is requested.
- [ ] OTP requests without a CAPTCHA token are rejected.
- [ ] The service role key is not present in the web bundle.

## Verify

Walk the Login Page flow in `project-overview.md` step by step. Try a protected route signed out.
