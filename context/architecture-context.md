# Architecture Context

## Stack

| Layer            | Technology                                    | Role                                                                          |
| ---------------- | --------------------------------------------- | ----------------------------------------------------------------------------- |
| Frontend         | React + TypeScript (Vite)                     | Single web app for all four roles, mobile-first for farmers                   |
| UI               | Tailwind + shadcn/ui                          | Component composition and styling                                             |
| Maps             | MapLibre GL JS + MapTiler tiles               | Plot pins, village map, wind-link map, demand heatmap (Phase 2)               |
| i18n             | react-i18next                                 | English and Punjabi UI strings                                                |
| Auth             | Supabase Auth (phone OTP)                     | User identity, OTP sign-in, JWT sessions                                      |
| Database         | Supabase Postgres + PostGIS                   | Relational metadata, geospatial data, row level security                      |
| File storage     | Supabase Storage (private bucket)             | ID proof documents                                                            |
| Live updates     | Supabase Realtime                             | Pool progress and activity timeline updates                                   |
| Backend API      | FastAPI (Python 3.11)                         | Business logic, ownership checks, matching, task triggering                   |
| Background tasks | Celery + Redis                                | Satellite verification, data ingest, scheduled jobs (APScheduler is allowed for the hackathon) |
| Satellite data   | NASA FIRMS API + Sentinel Hub (Copernicus Data Space) | Fire detections and Sentinel-2 imagery for NBR                        |
| Wind data        | Open-Meteo                                    | Wind speed and direction for the donor wind-link ranking                      |
| WhatsApp (Ph. 2) | WhatsApp Cloud API (Twilio sandbox for demo)  | Two-way messaging on the same backend                                         |
| LLM (Ph. 2)      | LLM API with strict JSON schema output        | Parse WhatsApp text into structured fields                                    |
| Hosting          | Vercel (web), Render or Railway (API, worker) | Deployment                                                                    |

## Authentication Decision: Supabase Auth With Phone OTP

Supabase Auth is the single identity system. Reasons:

- The user identity (`auth.users.id`) is the same ID used in row level security policies, so database access control and login cannot drift apart.
- It supports phone OTP out of the box, with test phone numbers and fixed OTPs for development and demos, so no real SMS is sent during the hackathon.
- A Send SMS Hook lets production route OTP messages through a regional SMS provider that supports Indian DLT-compliant templates.
- No second identity service (Firebase or Twilio Verify) to sync with the database.

Rules:

- Hackathon build: configure Supabase test phone numbers with fixed OTPs. Say so in the pitch.
- Production: replace test OTPs with a real SMS provider through the Supabase dashboard or the Send SMS Hook. Test OTPs are removed before production.
- Phone numbers are stored in E.164 format (+91XXXXXXXXXX).
- The browser uses only the Supabase anon key. The service role key exists only in the API and jobs environment.

## System Boundaries

- `web/src` — React UI: pages, components, hooks, i18n, Supabase client. No business rules.
- `api/app` — FastAPI app in layers (router, service, repository). Routers verify the JWT, validate input, and call services. Services hold business rules. Repositories are the only database access. `integrations/` holds the shared outbound HTTP client and third-party adapters.
- `api/app/jobs` — Long-running background jobs: satellite verification, data ingest, scheduled rechecks. Runs as a second process of the same package and reuses its services and repositories.
- `supabase` — Database migrations, row level security policies, seed data, and local config. This is the only place schema changes are made.
- `context` — Project spec files. They are the source of truth for behavior.
- Folder layout in detail is in `code-standards.md`. Security rules are in `security-context.md`.

## Storage Model

- **Database (Supabase Postgres)**: profiles, plots, listings, offers, pools, pickups, verification results, donations, requests, disbursements, notifications, and messages.
- **Supabase Storage**: ID proof documents only, in the private bucket `id-documents` at `{farmerId}/{documentId}.{ext}`. The path is stored in `id_verifications.document_path`.
- Satellite imagery is fetched on demand for computation and is not persisted. Only the small result (fire hit count, NBR change, confidence, verdict) is stored in `verifications`.
- Full ID numbers are never stored anywhere. Only the ID type, last four digits, and status.
- Do not store large generated content directly in the database.

## Auth And Role Model

- Every user has one row in `profiles` with `id = auth.users.id` and a `role`: `farmer`, `buyer`, `donor`, or `ngo`.
- Farmer, buyer, and donor roles are chosen once at first sign-in. NGO profiles are created by seed data and matched by phone number.
- Row level security is enabled on every table. Policies use `auth.uid()`.
- The API verifies the Supabase JWT on every request and applies role and ownership checks before any mutation.
- Cross-user operations (matching, pooling, verification writes, notifications) run in the API or its jobs process with the service role.

| Resource                     | Farmer                | Buyer                          | Donor                    | NGO                                  |
| ---------------------------- | --------------------- | ------------------------------ | ------------------------ | ------------------------------------ |
| Own profile                  | Read, update          | Read, update                   | Read, update             | Read, update                         |
| Plots, ID verification       | Own only              | No access                      | No access                | No access                            |
| Listings                     | Own only              | Listings in own pools          | No access                | No access                            |
| Offers                       | Own only              | Offers they are part of        | No access                | No access                            |
| Pools                        | Pools they belong to  | Own pools                      | No access                | No access                            |
| Pickups and weights          | Own read              | Create and update for own pools | No access               | No access                            |
| Payment status               | Update own            | Read for own pools             | No access                | No access                            |
| Verification status          | Own plots             | Village level for own pools    | Village level for funded | Village level for funded requests    |
| Demand posts                 | No access             | Own, create and update         | No access                | No access                            |
| Donations                    | No access             | No access                      | Own                      | Those addressed to the NGO           |
| Support requests             | Own, create           | No access                      | No access                | Requests addressed to the NGO        |
| Disbursements                | No access             | No access                      | Read own donations'      | Create and read own                  |

## Data Model

| Table                 | Key fields                                                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`            | id (= auth user id), phone, role, name, language, created_at                                                                                       |
| `farmers`             | profile_id, village_id, id_status (not_submitted, pending, verified, rejected), trust_score                                                        |
| `id_verifications`    | id, farmer_id, id_type, id_last4, document_path, status, rejection_reason, reviewed_at                                                             |
| `villages`            | id, name, geometry, district, paddy_area_est                                                                                                       |
| `plots`               | id, farmer_id, village_id, centre point, radius_m, acres                                                                                           |
| `buyers`              | profile_id, org_name, type (biomass, cbg, kiln, mill), location, capacity, price_per_tonne, min_load_tonnes                                        |
| `demand_posts`        | id, buyer_id, tonnes_needed, price_per_tonne, location, date_from, date_to, status                                                                 |
| `balers`              | id, name, location, daily_capacity, availability (seeded service providers, no login)                                                              |
| `listings`            | id, farmer_id, plot_id, est_tonnes, harvest_date, combine_sms_used, status, pool_id (nullable), source (web, whatsapp)                              |
| `offers`              | id, listing_id, pool_id, buyer_id, baler_id, price_per_tonne, pickup_start, pickup_end, status (pending, accepted, declined, expired)               |
| `pools`               | id, village_id, buyer_id, baler_id, target_tonnes, current_tonnes, pickup_date, status                                                             |
| `pickups`             | id, listing_id, pool_id, baler_id, weighed_tonnes, amount_due, payment_status (pending, received, not_received), payment_updated_at, quality_notes, completed_at |
| `verifications`       | id, plot_id, window_start, window_end, firms_hits, nbr_delta, verdict (verified, fire_detected, inconclusive), confidence, checked_at              |
| `ngos`                | id, profile_id, name, region, description, status                                                                                                  |
| `donations`           | id, donor_id, ngo_id, village_id (nullable), amount, est_tonnes, status, created_at                                                                |
| `assistance_requests` | id, farmer_id, listing_id, ngo_id, reason, amount_requested, status (submitted, approved, disbursed, declined), decided_at                          |
| `disbursements`       | id, assistance_request_id, donation_id, ngo_id, payee_type (baler, transport, farmer), amount, note, created_at                                    |
| `notifications`       | id, user_id, type, body, linked_record_type, linked_record_id, read_at, created_at                                                                 |
| `messages` (Phase 2)  | id, provider_message_id (unique, replay protection), profile_id (null for unknown numbers), phone_masked, direction, raw_text, parsed_json, intent, linked_record_type, linked_record_id, created_at |
| `risk_scores` (Phase 3) | village_id, date, score, forecast_tonnes                                                                                                         |

`pickups` is one row per farmer listing in a pool, because weights and payment status are per farmer. `listings.pool_id` is set when an offer is accepted. The row is created at that moment, with `unique(listing_id)`. `pickups.weighed_tonnes` is the column name everywhere (the first migration called it `actual_tonnes`; migration `20261009000000_core_spine.sql` renames it). `pickups` also carries `payment_updated_at`, `quality_notes`, and `completed_at`.

## Write Path

- Browser reads go to Supabase under row level security. Browser writes for business records (listings, offers, pools, pickups, ID status, payment status) go through the FastAPI with the user's bearer token (`web/src/lib/api.ts`). The API checks role and ownership, then writes with the service role.
- Row level security therefore has no insert or update policy for those tables. Migration `20261009000000_core_spine.sql` dropped the earlier direct-write policies on `listings`, `offers` and `pickups`, and revoked insert and update on `farmers` and `id_verifications` from the browser roles (a farmer can only insert their own `profile_id` and `village_id` on `farmers`). A farmer can never set their own `id_status` from the client.
- `buyer_owns_pool(pool_id)` is a security definer helper used by policies on `listings` and `pickups`. It exists to avoid an RLS loop between `pools` and `listings`.
- `listing_match_candidates(listing_id)` is an RPC callable only by the service role. It returns buyers and available balers with their distance in kilometres from the listing's plot, because PostgREST cannot read PostGIS geometry as numbers.
- The API follows the layers in `code-standards.md`: `routers/v1` (thin) calls `services` (rules) which call `repositories` (the only code that touches tables). Services and routers are synchronous functions because the Supabase client is synchronous; FastAPI runs them in its thread pool. Geometry is written as EWKT text (`SRID=4326;POINT(lng lat)`).
- A record that exists but belongs to another user returns `404`, through the `NotFoundError` domain error.

## Matching And Pooling Model

- Input: a confirmed listing, open buyers, balers, and open pools.
- Score: weighted sum of distance (lower is better), price (higher is better), capacity fit, and availability overlap. Weights are config values.
- Output: an offer for the farmer. Accepting it adds the listing to a village pool, or creates one.
- Pooling: group listings by village and nearby villages within a configured radius. A pool is ready when total tonnes reach the buyer's minimum load. Then a pickup date is fixed and members are notified.
- There is no route optimisation.
- Matching is deterministic and runs in the API. It is not long-running work.

## Verification Model

- Input: a plot, its harvest date, and a verification window (harvest date to sowing date).
- Execution: durable background job queued when a pickup is marked complete.
- Signal 1: NASA FIRMS detections (VIIRS 375 m and MODIS) inside the plot buffer during the window.
- Signal 2: Sentinel-2 NBR (band 8 NIR, band 12 SWIR) from the latest cloud-free image before pickup and after pickup. A drop above a configured threshold suggests burning.
- Verdict rules:
  - Any FIRMS hit, or an NBR drop above the threshold: `fire_detected`.
  - No hit, no drop, and at least one usable cloud-free image on each side: `verified`.
  - Otherwise (cloud cover, missed overpass, too few images): `inconclusive`, and a recheck job is scheduled.
- Confidence label (high, medium, low) reflects plot size against pixel size and the number of usable images. Small plots also get village-pool-level reporting.
- Output: one `verifications` row, a status shown on the plot and pool, and in-app notifications to linked donors and NGOs.
- Limits to state in the UI: cloud cover, late-afternoon fires missed by overpasses, and small plots.

## Wind-Link Ranking Model

- Input: a chosen city and day, village centres, and wind direction and speed from Open-Meteo.
- Score: how closely the bearing from village to city matches the wind direction, weighted by distance and by fire or risk level.
- Output: a ranked list labelled "likely influence". It is never presented as the exact cause.

## WhatsApp Sync Model (Phase 2)

- The WhatsApp webhook and the web app call the same service layer in the API. No operation exists only on WhatsApp.
- The webhook verifies the Meta signature, matches the phone number to a `profiles` row, and stores the raw message in `messages`.
- An LLM extracts intent and fields into a strict JSON schema. The operation then runs through the normal API logic.
- Questions ("When is my pickup?") are answered by database queries filled into fixed Punjabi reply templates, not by free-form model text.
- Records created over WhatsApp carry `source = whatsapp` and appear in the farmer's activity timeline and the buyer's view.
- An unknown phone number gets a short message pointing to registration.
- If a record is edited on web and WhatsApp, the latest edit wins and both stay in the activity log.
- Implementation: `POST /api/v1/webhooks/whatsapp` (Twilio form fields) verifies `X-Twilio-Signature` over `PUBLIC_BASE_URL` plus the path and every form field, then queues `conversation_service.handle_inbound` as a FastAPI background task and returns an empty TwiML response. The message is stored first, and a repeated `MessageSid` is dropped. The acting user is looked up from the sender's phone number in `profiles`.
- `integrations/llm.py` returns only a `ParsedMessage` (intent from the allowlist plus acres, harvest date, payment status). Output that fails the schema, has extra fields, or comes from a failed call becomes intent `unknown`, which gets a clarification reply and creates nothing. `integrations/whatsapp.py` is the single Twilio adapter (signature check, send).
- Operations reuse `listing_service`, `matching_service` and `pickup_service`. Questions are answered from repository reads filled into `services/whatsapp_templates.py`.
- Only farmers may use the chat. Other roles get a short "farmers only" reply. "Request support" replies that it is unavailable until the charity tables exist.
- Mocks (config flags, default on): `MOCK_WHATSAPP_SEND` (replies are stored and logged, not sent) and `MOCK_LLM_PARSER` (keyword parser for the demo phrases). Signature verification is never mocked.
- Full phone numbers are not stored in `messages`. Only the masked form is, which keeps the rule that full numbers live in `profiles`.

## Forecast Model (Phase 3)

- Harvest timing from Sentinel-2 NDVI time series, combined with three seasons of FIRMS fire counts, area under paddy, distance to the nearest baler and buyer, and days left before wheat sowing.
- Output: risk score (0 to 100) per village and forecast tonnes per week, shown to buyers and NGOs.
- Start with a transparent weighted score. Report how well it matches actual fires.

## Invariants

1. Request handlers do not run long-lived work. Satellite processing and LLM parsing belong in background tasks.
2. Metadata and uploaded documents are stored in separate layers. Satellite imagery is never persisted.
3. Auth and ownership are enforced at every mutation boundary, in both the API and row level security.
4. The service role key never reaches the browser.
5. No full ID number is stored anywhere. Only ID type, last four digits, and status.
6. No code path moves money. `payment_status` and donations are recorded values only.
7. Verification verdicts are limited to Verified, Fire detected, and Inconclusive. Inconclusive is never rounded up to Verified.
8. Individual plots are never shown publicly. Donors and NGOs see village-level data.
9. Wind-link results always use "likely influence" wording.
10. Web and WhatsApp share one service layer and one database (Phase 2).
11. Schema changes happen only through migrations in `supabase/migrations`.
12. The rules in `security-context.md` apply to every unit. No unit is done until its security checklist passes.
13. Business logic exists once, in services. Routers, jobs, and the WhatsApp webhook all call the same services.
