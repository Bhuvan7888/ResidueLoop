# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 1: Web application. Scaffolded, but the backend services were stubs (audit of 2026-10-09, below). The core spine is being repaired on branch `phase-2-whatsapp`.
- Phase 2: WhatsApp & Heatmap. Not started.

## Current Goal

- Repair the core spine (listings, matching, pools, pickups, payment status, web-to-API wiring), then build Unit 09 (WhatsApp).

## Audit Of Phase 1 (2026-10-09)

The earlier "Phase 1 complete" status was wrong for the backend as it was not complete. Real state before the repair:

- The API could not start: `main.py` imported `routers/v1/charity.py`, which was not in the repo.
- The web app called `supabase.functions.invoke('api/v1/...')`, not the FastAPI service.
- Stubs or mock returns: `create_listing`, `create_plot`, ID upload, buyer profile and demand posts. Matching picked the first buyer and baler. No `pickups` rows were created.
- Schema and code disagreed (`pickups.actual_tonnes` vs `weighed_tonnes`, `offers` without pickup window).
- `migrations/..._unit05.sql` re-added `listings.pool_id`, so it failed on a fresh database. Fixed.
- No `.gitignore` covered `api/.env`. Fixed.
- No migrations, or code the tables can run against, exist for `verifications`, `ngos`, `donations`, `assistance_requests`, `disbursements`, `notifications`. `verification_service` imports `integrations/firms.py` and `sentinel.py`, which do not exist, and `charity_service` uses columns that are not in any table.

## Completed

- Planning: project plan v2 and the context files.
- Migrations 00 to 05 and `seed.sql` applied to the team Supabase project through the SQL Editor.
- Web screens for units 01 to 08 exist as UI shells. Their backend is not complete, see "In Progress" and "Deferred".

## In Progress

- Unit 09 (WhatsApp sync) on branch `phase-2-whatsapp`. The core spine repair is done and committed, see Session Notes.
- Blocked on input: the new migration `20261009000000_core_spine.sql` must be run in the Supabase SQL Editor, then the live flow can be walked.

## Deferred (needs the team, not part of the spine repair)

- Unit 07 satellite verification: real service, `integrations/firms.py`, `integrations/sentinel.py`, `verifications` table, jobs process.
- Unit 08 charity: `ngos`, `donations`, `assistance_requests`, `disbursements`, `notifications` tables and services, wind-link ranking (currently a mock score).
- Unit 11 security hardening: only partly in place (headers, rate limit middleware exist; tests are placeholders).
- Unit 03 ID document storage and encryption (mocked).

## Next Up

Phase 2:

10. `09-whatsapp-sync.md`
11. `10-buyer-heatmap.md`

## Inputs Needed From User

The build continues with fallbacks for every item. Ask the user for these at the end of the unit that needs them and in the final report. Values go in the env files, never in chat.

| Input                                                      | Needed by | Used for                            | Where to get it                              | Env file and variable                                   | Status |
| ---------------------------------------------------------- | --------- | ----------------------------------- | -------------------------------------------- | ------------------------------------------------------- | ------ |
| Supabase project: URL, anon key, service role key, DB URL, JWT secret | Unit 01 | Database, auth, storage             | Supabase dashboard, Project Settings         | `web/.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. `api/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `SUPABASE_JWT_SECRET` | Provided (team project, migrations 00 to 05 applied) |
| Supabase phone provider with test numbers and fixed OTPs   | Unit 02   | OTP sign-in for the demo            | Supabase dashboard, Authentication           | Dashboard setting                                       | Needed |
| CAPTCHA site key and secret (Turnstile or hCaptcha)        | Unit 02   | OTP abuse protection                | Cloudflare or hCaptcha dashboard             | `web/.env.local`: `VITE_CAPTCHA_SITE_KEY`. Secret in the Supabase dashboard | Needed |
| MapTiler key                                               | Unit 03   | Basemap tiles                       | MapTiler account                             | `web/.env.local`: `VITE_MAPTILER_KEY`                   | Provided |
| NASA FIRMS MAP_KEY                                         | Unit 07   | Fire detections                     | FIRMS website                                | `api/.env`: `NASA_FIRMS_MAP_KEY`                        | Provided |
| Copernicus Data Space OAuth client (or Earth Engine)       | Unit 07   | Sentinel-2 imagery                  | Copernicus Data Space dashboard              | `api/.env`: `CDSE_CLIENT_ID`, `CDSE_CLIENT_SECRET`      | Needed |
| API base URL for the web app                               | Core spine | Web calls the FastAPI            | The URL where the API runs (`http://localhost:8000` locally) | `web/.env.local`: `VITE_API_URL`                      | Set locally |
| Google Cloud Translation API key (optional)                | Any unit  | Dev-time Punjabi draft or cross-check, not shipped | Google Cloud console          | `api/.env` or a local-only script env: `GOOGLE_TRANSLATE_API_KEY` | Optional |
| WhatsApp provider (Twilio sandbox or Meta test number)     | Unit 09   | Two-way WhatsApp                    | Twilio or Meta for Developers                | `api/.env`: provider variables                          | Provided (Twilio sandbox, number +1 737 250 8034, join code `twilio-trial`) |
| LLM API key                                                | Unit 09   | WhatsApp message parsing            | LLM provider console                         | `api/.env`: `LLM_API_KEY`                               | Provided (Gemini). Rotate: the first key was exposed in chat |

## Open Questions

- Role selection: is choosing Farmer, Buyer, or Donor at first sign-in enough, or should buyers be approved before they can see farmers' listings?
- Can an unverified farmer list at all, or browse only? (Current spec: browse only.)
- Pool cutoff: what happens if a pool does not reach the minimum load before the sowing window closes?
- Verification thresholds: default NBR drop threshold and verification window length (harvest date to sowing date). Both are config values and need validating.
- Who sets the price per tonne: the buyer profile value, or per offer? (Current spec: the buyer profile value.)
- Hindi UI: in Phase 1, or later? (Current spec: English and Punjabi only.)
- Platform fee on donations: charge one, or full pass-through to NGOs?
- Straw per acre (2 to 3 tonnes) and minimum truckload (8 to 10 tonnes) need validating with a real farmer and buyer.
- ID document retention: delete after review (default) or keep for a set period?
- Licensed fonts: GT Alpina and SAA Series A, or stay on the free stand-ins (Fraunces, Inter)?
- Hosting and DNS: which registrar, DNS provider, and CDN or WAF in front of the API?
- Production SMS provider for OTP (Indian DLT-compliant) and ID verification partner are undecided.

## Architecture Decisions

- Database is Supabase Postgres with PostGIS. Schema changes only through migrations in `supabase/migrations`.
- Authentication is Supabase Auth with phone OTP. Hackathon build uses Supabase test phone numbers and fixed OTPs.
- ID documents go in a private Supabase Storage bucket. Only ID type, last four digits, and status are stored in the database.
- No payment gateway. Payment status is recorded by the farmer. Donations are recorded in test mode.
- No digital certificate. Verification is shown as a status inside the app.
- No district officer, panchayat, or baler operator login. Balers are seeded service providers. The buyer enters weighed tonnes at pickup.
- `pickups` is one row per farmer listing in a pool, because weights and payment status are per farmer.
- No route optimisation. Pickup is one date per pool.
- Design follows divinefarmer.com: light, cream and mustard, serif headings, flat surfaces. Replaces the earlier dark look.
- Background jobs run as a second process of the `api` package using APScheduler so services are not duplicated (Redis cannot run locally in the hackathon environment).
- Security rules live in `security-context.md` and are applied per unit, with a final hardening unit.
- Mocked in the hackathon build: ID review, payments, and OTP delivery.

## Session Notes

- 2026-10-09, core spine repair (branch `phase-2-whatsapp`): API boots; repositories layer (`api/app/repositories`); real services for plots, ID (review mocked), buyer profile and demand, listings, matching (weights in config), offers, pools, pickups, weights, payment status; web calls the FastAPI through `web/src/lib/api.ts`; 31 API tests, ruff and mypy clean on the new code. Not yet checked against a live database.
- Mocked in this repair: ID review (`MOCK_ID_REVIEW`), ID file storage and encryption, verification queue (`queue_verification` is a stub).
- Files imported by the repo but never committed (the teammate must push them): `api/app/routers/v1/charity.py`, `api/app/integrations/firms.py`, `api/app/integrations/sentinel.py`, `web/src/features/charity/api.ts`, `web/src/features/verification/components/VerificationCard.tsx`. Until then `tsc -b` fails on those imports and the farmer dashboard cannot render.
- Existing pgTAP tests (`rls_*_test.sql`) use column names that are not in the schema and never switch role, so they do not test RLS yet. To rewrite.
- `web/package.json` has no `test` script although CI runs `npm run test`.

- Hackathon timeline: Thu Oct 8 (define and de-risk), Fri Oct 9 (core end to end), Sat Oct 10 (verification and charity), Sun Oct 11 (Phase 2 slice if time, polish, pitch).
- Six credentials unlock Phase 1: NASA FIRMS key, Copernicus or Earth Engine credential, Supabase project (URL, anon key, service role key, database URL), MapTiler key, Supabase test phone numbers, and a JWT-verification secret.
- Record a backup video of the full flow on Saturday night.
