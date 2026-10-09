# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 2: WhatsApp & Heatmap. In Progress (starting Unit 09).

## Current Goal

- Begin WhatsApp synchronization.

## Completed

- Planning: project plan v2 and the context files.
- Unit 01: project foundation (`featureSpecs/01-foundation.md`).
- Unit 02: auth and roles (`featureSpecs/02-auth-and-roles.md`).
- Unit 03: farmer profile and ID verification (`featureSpecs/03-farmer-profile-and-id.md`).
- Unit 04: buyers and listings (`featureSpecs/04-buyers-and-listings.md`).
- Unit 05: matching and pooling (`featureSpecs/05-matching-and-pooling.md`).
- Unit 06: pickup and payment status (`featureSpecs/06-pickup-and-payment-status.md`).
- Unit 07: satellite verification (`featureSpecs/07-satellite-verification.md`).
- Unit 08: charity (`featureSpecs/08-charity.md`).
- Unit 11: security hardening (`featureSpecs/11-security-hardening.md`).
- Phase 1: Web application completed.
- Unit 09: WhatsApp synchronization (`featureSpecs/09-whatsapp-sync.md`).

## In Progress

- Unit 10: Buyer Heatmap (`featureSpecs/10-buyer-heatmap.md`).

## Next Up

Phase 2:

10. `10-buyer-heatmap.md`

## Inputs Needed From User

The build continues with fallbacks for every item. Ask the user for these at the end of the unit that needs them and in the final report. Values go in the env files, never in chat.

| Input                                                      | Needed by | Used for                            | Where to get it                              | Env file and variable                                   | Status |
| ---------------------------------------------------------- | --------- | ----------------------------------- | -------------------------------------------- | ------------------------------------------------------- | ------ |
| Supabase project: URL, anon key, service role key, DB URL, JWT secret | Unit 01 | Database, auth, storage             | Supabase dashboard, Project Settings         | `web/.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. `api/.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `SUPABASE_JWT_SECRET` | Provided |
| Supabase phone provider with test numbers and fixed OTPs   | Unit 02   | OTP sign-in for the demo            | Supabase dashboard, Authentication           | Dashboard setting                                       | Provided |
| CAPTCHA site key and secret (Turnstile or hCaptcha)        | Unit 02   | OTP abuse protection                | Cloudflare or hCaptcha dashboard             | `web/.env.local`: `VITE_CAPTCHA_SITE_KEY`. Secret in the Supabase dashboard | Provided |
| MapTiler key                                               | Unit 03   | Basemap tiles                       | MapTiler account                             | `web/.env.local`: `VITE_MAPTILER_KEY`                   | Provided |
| NASA FIRMS MAP_KEY                                         | Unit 07   | Fire detections                     | FIRMS website                                | `api/.env`: `NASA_FIRMS_MAP_KEY`                        | Provided |
| Copernicus Data Space OAuth client (or Earth Engine)       | Unit 07   | Sentinel-2 imagery                  | Copernicus Data Space dashboard              | `api/.env`: `CDSE_CLIENT_ID`, `CDSE_CLIENT_SECRET`      | Provided |
| Google Cloud Translation API key (optional)                | Any unit  | Dev-time Punjabi draft or cross-check, not shipped | Google Cloud console          | `api/.env` or a local-only script env: `GOOGLE_TRANSLATE_API_KEY` | Optional |
| WhatsApp provider (Twilio sandbox or Meta test number)     | Unit 09   | Two-way WhatsApp                    | Twilio or Meta for Developers                | `api/.env`: provider variables                          | Phase 2 |
| LLM API key                                                | Unit 09   | WhatsApp message parsing            | LLM provider console                         | `api/.env`: `LLM_API_KEY`                               | Provided |

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
- Authentication is Supabase Auth with phone OTP. Hackathon build uses Supabase test phone numbers and fixed OTPs (the UI takes 10 digits and prepends +91, which must exactly match the E.164 test number in Supabase to bypass Twilio).
- ID documents go in a private Supabase Storage bucket. Only ID type, last four digits, and status are stored in the database.
- No payment gateway. Payment status is recorded by the farmer. Donations are recorded in test mode.
- No digital certificate. Verification is shown as a status inside the app.
- No district officer, panchayat, or baler operator login. Balers are seeded service providers. The buyer enters weighed tonnes at pickup.
- `pickups` is one row per farmer listing in a pool, because weights and payment status are per farmer.
- No route optimisation. Pickup is one date per pool.
- Design follows divinefarmer.com: light, cream and mustard, serif headings, flat surfaces. Replaces the earlier dark look.
- Background jobs run as a second process of the `api` package using APScheduler so services are not duplicated (Redis cannot run locally in the hackathon environment).
- Security rules live in `security-context.md` and are applied per unit, with a final hardening unit.
- Mocked in the hackathon build: ID review (auto-approve), payments, and OTP delivery. Satellite integrations (NASA FIRMS and Sentinel CDSE) and ID storage are fully integrated.

## Session Notes

- Hackathon timeline: Thu Oct 8 (define and de-risk), Fri Oct 9 (core end to end), Sat Oct 10 (verification and charity), Sun Oct 11 (Phase 2 slice if time, polish, pitch).
- Six credentials unlock Phase 1: NASA FIRMS key, Copernicus or Earth Engine credential, Supabase project (URL, anon key, service role key, database URL), MapTiler key, Supabase test phone numbers, and a JWT-verification secret.
- Record a backup video of the full flow on Saturday night.
