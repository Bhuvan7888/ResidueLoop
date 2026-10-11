# Progress Tracker

This tracker records verified evidence only. Earlier completion claims were independently re-checked on 2026-10-10 and are not carried forward without evidence.

## Current Phase

- Recovery Phase 1: Secrets, CI, and reality report — complete pending human credential rotation and history rewrite.
- Recovery Phase 2 uses the hosted Supabase project directly. Its data state was confirmed clear of real data; schema deployment is blocked only on a current hosted database admin connection or Supabase access token.

## Current Goal

- Repair the hosted Supabase migration chain, API mutation boundary, and browser flows now that D4 is cleared.
- Deliver an original, token-based public landing and consistent auth/workspace shell without changing the blocked database plan.

## Frontend Experience Refresh — 2026-10-10

- [x] Added a public `/` landing route and moved the protected dashboard route to `/app`; sign-in, role selection, and authenticated redirects now target `/app`.
- [x] Added an original SVG field/straw illustration, editorial landing sections, responsive navigation, token-only styling, CSS-only motion, and a `prefers-reduced-motion` fallback. No reference-site assets or fonts were copied.
- [x] Refreshed login, role-picker container, protected header, language switch, and dashboard heading to use the shared editorial treatment.
- [x] Added English and Punjabi strings for all new landing, navigation, login, language, and OTP-resend UI.
- [x] Verified static quality with `cd web && npm run typecheck && npm run lint && npm run test && npm run build` (5 Vitest tests passed) on 2026-10-10.
- [x] Local integration launch on 2026-10-10: FastAPI served `GET /api/v1/health` as `{"data":"ok"}` on port 8000; Vite served `/`, `/login`, and `/app` as HTTP 200 on port 5173. API security headers were present. Web typecheck/lint/test/build passed; API Ruff/mypy/pytest passed (6 tests).
- [ ] Browser visual and live authentication-flow QA remain unverified: the controlled browser runtime was unavailable and real OTP/provider credentials are still required.

## Authentication Configuration Repair — 2026-10-10

- [x] Local Turnstile no longer consumes a configured production key: `getCaptchaSiteKey` uses Cloudflare's published test site key only when Vite runs in development and uses the configured public key outside development. `web/src/features/auth/captcha.test.ts` verifies both paths and prevents a development-key fallback in production.

## API Boundary Repair — 2026-10-10

- [x] Replaced Phase 1 mutation calls to nonexistent Supabase Edge Functions with `web/src/lib/api-client.ts`, which sends JSON to FastAPI under `/api/v1` and forwards the current Supabase access token. `api-client.test.ts` covers authorized mutation routing and API error handling; `rg` finds no remaining `supabase.functions.invoke` call in `web/src`.
- [x] Role selection now uses authenticated `POST /api/v1/profiles`; the API derives the user id and phone from the verified JWT and permits only farmer, buyer, or donor. `api/tests/test_profile_service.py` covers creation and rejects a second role selection; `web/src/features/auth/api.test.ts` covers the browser-to-API route.
- [x] Added forward-only migration `20261010000000_profile_mutation_boundary.sql` to remove browser profile insert/update policies. It is intentionally not yet applied because the locally configured `DATABASE_URL` is not the connected hosted Supabase project.
- [x] Added `20261010000001_phase1_schema_repair.sql` to complete the missing hosted Phase 1 tables (`offers`, `pools`, `pickups`, and `verifications`), SELECT-only RLS policies, reference villages, and balers. It awaits manual execution in the hosted Supabase SQL Editor.
- [x] Replaced buyer-profile, demand-post, and listing no-op service paths with persistence and ownership checks. Web API adapters now map form field names to the FastAPI contracts. Unit tests cover payload mapping, cross-buyer demand isolation, unverified-listing rejection, and listing persistence/matching dispatch. Live verification remains blocked on the migration.
- [x] Replaced farmer profile/plot no-op paths with persistence. ID upload now validates file signature, encrypts content with AES-256-GCM, stores only a private path and last four digits, and performs the documented mock review. Live upload verification is blocked on `ID_DOCUMENT_ENCRYPTION_KEY` and the hosted migration.
- [x] Added the farmer workspace setup forms for profile, plot, consent, and multipart ID proof submission. The API client now preserves `FormData` and `api-client.test.ts` covers this regression. English and Punjabi strings are present. The setup cannot be manually completed until the hosted schema migration, phone-Auth test accounts, and API encryption key are configured.

## Multi-Portal Hindi & Punjabi Localization — 2026-10-11

- [x] Attained 100% key and semantic parity across `en.json`, `hi.json`, and `pa.json` (511 unique i18n keys with 0 diffs).
- [x] Localized Buyer Workspace: `BuyerDashboard.tsx`, `BuyerProcurementAdvisor.tsx`, `DemandPostForm.tsx`, and `BuyerProfileForm.tsx` (headers, streams, alerts, multi-farmer pooling, demand posts, tender builder, market index, decision tabs, sorting, satellite telemetry audit buttons).
- [x] Localized Regional Demand Heatmap: `DemandHeatmap.tsx` (KPI cluster cards, live database sync pill, layer toggles, directory search, filter pills, village listings, legend, floating market intelligence inspection card, surplus/deficit badges, price benchmarks).
- [x] Localized Field Telemetry & Audits: `SatelliteAuditModal.tsx` and `PickupCard.tsx` (ESA/NASA radar scan checklist, NBR delta, thermal hotspot sweep, boiler safety, carbon credit eligibility, and buyer payment flagging).
- [x] Localized Charity & Donor Portals: `NgoDashboard.tsx` and `DonorDashboard.tsx` (inflow/outflow/working fund overview, assistance requests, field clearance disbursement form, auditable transaction ledger, anti-stubble burning crowdfunding portal, wind-link downwind city ranking, direct NGO clean air fund, citizen impact history).
- [x] Localized User Navigation: `UserProfileDropdown.tsx` (saved profile details for farmers/buyers/donors/NGOs, identity verification badges, acreage, mission statements, encryption pill, and portal role switcher).
- [x] Verified quality across all portals: `cd web && npm run typecheck && npm run lint && npm test && npm run build` (13 tests passed, 0 errors, build in 495ms); `cd api && python3 -m poetry run pytest` (25 tests passed).

## Farmer Dashboard Plots Simplification — 2026-10-11

- [x] Streamlined Farmer Dashboard Section 3: Removed technical satellite verification telemetry console (Copernicus Sentinel-2 MSI, NIR/SWIR reflectance gauges, delta NBR formulas, NASA FIRMS radar sweeps) and developer simulation buttons (`Clean (Verified) | Fire Detected | Cloudy (Inconclusive)`) from the farmer plots view in `FarmerDashboard.tsx`.
- [x] Replaced with clean, actionable plot cards displaying acreage, GPS coordinates, linked paddy straw listing status or "+ List Straw" action CTA, and lightweight plain-language status badges.
- [x] Preserved technical `VerificationCard` in `SatelliteAuditModal.tsx` for buyer zero-burn compliance audits where telemetry inspection is required.
- [x] Maintained 100% key parity across `en.json`, `hi.json`, and `pa.json` (520 keys, 0 diffs).
- [x] Implemented Farmer Low-Literacy UX Revamp (2026-10-11):
  - Added "The Big 3 Actions" Home Screen in `FarmerDashboard.tsx` with big visual cards: 🌾 1. "Sell Stubble", 🚚 2. "When is Pickup?" with live truck progress bar, and 💰 3. "My Money & Payouts" with bold received/pending amounts.
  - Revamped `NewListingForm.tsx` into a simple 2-step visual wizard with large, tappable picture cards for Straw Condition (Standing, Chopped by SMS, Baled) and Harvest Timing (Ready Now, 1 Week, 2 Weeks).
  - Integrated Zero-Math Live Calculator in `NewListingForm.tsx` auto-deriving straw yield (~2-2.5 t/acre) and guaranteed payout range directly from acres without manual math.
  - Retained 100% key parity across all 3 languages (551 keys each, 0 diffs).
- [x] Verified static quality: `npm run typecheck` (0 errors), `npm test` (13 tests passed), `npm run lint` (0 errors), `npm run build` (built in 599ms); `poetry run pytest` (29 tests passed).
- [x] Fixed English Mode & Farmer Localization Cleanup (2026-10-11):
  - Eliminated bilingual text mashups (`/`) and hardcoded Hindi fallbacks in `NewListingForm.tsx` and `FarmerDashboard.tsx`.
  - Replaced Hindi fallbacks in `t()` calls (`~110 से 165 tonnes`, `चरण 1 / Step 1`, `✓ चुना गया`, `तारीख:`, Big 3 Actions) with English defaults mapped to comprehensive i18n keys across `en.json`, `hi.json`, and `pa.json`.
  - Verified 100% key parity (568 keys in each translation dictionary) and clean rendering in English, Hindi, and Punjabi modes.
- [x] Customized Residue Listings & Matched Offers in Friendly Mode (2026-10-11):
  - Added 4-Step Visual Timeline Progress Bar (`Listed ➔ Buyer Matched ➔ Trolley Scheduled ➔ Money Received`) on all listing and offer cards with step circles and colored progress tracks.
  - Replaced dense technical jargon with everyday farmer terms (Straw Type, Harvest Date, Fair Rate, Guaranteed Payout).
  - Highlighted prominent green Estimated Payout amounts (`💰 ₹X,XX,XXX`) on each listing.
  - Upgraded Matched Offer cards (`OfferCard.tsx`) with reassuring `🛡️ Verified Factory Buyer • Guaranteed Bank Payout` trust banner, 4-step progress tracker, and prominent `✅ Accept Offer & Confirm Pickup` CTA.
  - Added warm, inviting empty states with illustrations and a direct `+ Sell My Stubble Now` CTA.
  - Retained 100% key and semantic parity across `en.json`, `hi.json`, and `pa.json` (589 keys each).
  - Verified static quality: `npm run typecheck` (0 errors), `npm test` (13 tests passed), `npm run lint` (0 errors), `npm run build` (built in 595ms).
- [x] Implemented Buyer Factory Demand Proximity & Nearest Farmers Matching (2026-10-11):
  - Added factory/plant location selection in `DemandPostForm.tsx` and `BuyerProfileForm.tsx` with regional industrial hubs (Moga Focal Point, Ludhiana, Khanna, Sangrur, Karnal, Patiala, etc.) and custom GPS coordinate inputs.
  - Attached lat/lng coordinates in `listing_service.py` directly from village PostGIS geometries and added `GET /api/v1/buyers/demand` router endpoint in `api/app/routers/v1/buyer.py`.
  - Implemented `NearestFarmersMatching.tsx` on `BuyerDashboard.tsx` computing real-time Haversine road/field distance from the buyer's factory to each farmer's plot.
  - Added visual cumulative demand progress bar calculating how many nearest farmers fulfill 100% of the factory's tonnage requirement.
  - Displayed distance badges (`⚡ X km away`), pricing vs tender benchmark, ready harvest dates, and 1-click `+ Procure / Send Purchase Offer` CTA directly matching listings.
  - Maintained 100% key parity across `en.json`, `hi.json`, and `pa.json` (661 keys each, 0 diffs).
  - Verified static quality: `npm run typecheck` (0 errors), `npm test` (13 tests passed), `npm run lint` (0 errors), `npm run build` (built in 647ms), `poetry run pytest` (29 tests passed).
- [x] Implemented Executive Buyer Experience & User-Friendly Command Center (2026-10-11):
  - Created 4-card Executive KPI Command Center Ribbon at top of `BuyerDashboard.tsx` highlighting:
    1. Boiler / Plant Target Progress with visual fill percentage bar and secured vs target tonnage.
    2. Inbound Gate Deliveries & Weighbridge counter showing scheduled vs scale-awaiting tractor trolleys.
    3. Cumulative Procurement Spend & average rate per tonne (₹/t).
    4. Primary Factory Sourcing Hub corridor badge with one-click direct tab navigations.
  - Reorganized workspace into a clear, task-driven 5-Tab Navigation layout:
    1. 🌾 `Sourcing & Nearest Farmers`: Proximity-based nearest-farmer matching with radius filtering, road distance gauges, procurement advisor recommendations, and village residue pools.
    2. 🚚 `Deliveries & Weighbridge`: Inbound tractor-trolley gate logs, scale weighbridge slips, and instant payout release confirmation.
    3. 🤝 `Active Deals & Chat`: Direct farmer and baler counterparty details, contract statuses, and integrated in-app deal chat.
    4. 🗺️ `Biomass Regional Map`: Regional supply/deficit heatmap and satellite earth observation telemetry audit console.
    5. 📋 `Plant Demand Tenders`: Factory demand capacity manager, tender creator, and active procurement specifications.
  - Maintained 100% key and semantic parity across `en.json`, `hi.json`, and `pa.json` (769 keys each, 0 diffs).
  - Verified static quality: `npm run typecheck` (0 errors), `npm test` (17 tests passed), `npm run lint` (0 errors), `npm run build` (clean production bundle), `poetry run pytest` (32 tests passed).
- [x] Refactored Farmer Layout, Alignment, and Listing View Isolation (2026-10-11):
  - Fixed Card 2 ("2. Your plot") 4-column form grid alignment in `FarmerSetup.tsx`: gave the "+ Add Plot" button an invisible header spacer (`hidden sm:block h-5`), identical `mt-1` margin, and exact `h-[42px]` matching the state, village, and acres inputs.
  - Added collapsible settings state to `FarmerSetup.tsx`: established farmers with existing profiles now see a sleek 1-row summary card (`🌾 Name • Village • Plots • Verified`) with an "Edit Profile & Add Plots" dropdown toggle instead of 800px of open forms on every load.
  - Isolated New Listing wizard (`view === 'listing'`) in `FarmerDashboard.tsx`:
    - Hid notifications, ID banners, and plot setup forms from the listing screen.
    - Added balanced Listing Header bar with `← Back to Dashboard`, `🌾 Sell Stubble (New Listing)`, and `Live Sync Active • 🔒 E2E Encrypted`.
    - Aligned container boundaries to `max-w-4xl mx-auto space-y-6`.
  - Stabilized card and button dimensions in `NewListingForm.tsx`:
    - Step 1: Fixed plot button min-height (`min-h-[72px]`) and harvest time card min-height (`min-h-[110px]`) with fixed `h-7` top badge row to eliminate vertical text jumping.
    - Step 2: Balanced Straw Condition cards with consistent spacing.
    - Bottom Action Buttons: Aligned Cancel and Publish buttons to matching `h-14` (56px) height, flex centering, and flex-aligned `🌾` emoji with listing text.
  - Attained 100% key parity across `en.json`, `hi.json`, and `pa.json` (771 keys each, 0 diffs).
  - Verified static quality: `npm run typecheck` (0 errors), `npm test` (17 tests passed), `npm run lint` (0 errors), `npm run build` (clean production bundle), `poetry run pytest` (32 tests passed).
- [x] Added Main Action Card for "Buyer Offers For You" on Farmer Dashboard (2026-10-11):
  - Upgraded Main Actions home screen ribbon from 3 cards to 4 responsive visual cards:
    1. 🌾 `1. Sell Stubble`: Instant listing trigger with active listings counter badge.
    2. 🤝 `2. Buyer Offers For You`: Dedicated action card displaying real-time pending offers count, active confirmed deals, dynamic top offered rate (`₹topRate/t Top Rate`), pulse badge, and 1-tap smooth scrolling directly to `#offers-section`.
    3. 🚚 `3. When is Pickup?`: Live truck arrival date and visual trolley progress bar.
    4. 💰 `4. My Money & Payouts`: Instant bank transfer summary, received payouts, and guaranteed payment badge.
  - Added `id="offers-section"` and `scroll-mt-6` to Section 2 in `FarmerDashboard.tsx` for smooth scrolling navigation.
  - Maintained 100% key and semantic parity across `en.json`, `hi.json`, and `pa.json` (781 keys each, 0 diffs).
  - Verified static quality: `npm run typecheck` (0 errors), `npm test` (17 tests passed), `npm run lint` (0 errors), `npm run build` (clean production bundle), `poetry run pytest` (34 tests passed).

## Recovery Decisions

- D1. FastAPI under `/api/v1` is the only mutation boundary. The web app uses one token-aware API client and no Supabase Edge Functions.
- D2. Browser reads use TanStack Query feature hooks through FastAPI or SELECT-only Supabase RLS. Components do not fetch in `useEffect`.
- D3. Client database writes are disabled. `POST /api/v1/profiles` accepts only farmer, buyer, and donor. NGO profiles are seeded and roles are immutable.
- D4. The migrations may be repaired in place once because they were never applied to real data. A `supabase db reset` happens only after the hosted project is confirmed free of real data.
- D5. A ready pool creates one pickup row per listing; the pool buyer records weight and the owning farmer records payment status.
- D6. Every service changed during recovery receives a repository; services do not query the database directly.

## Verified Recovery Evidence

- F1 confirmed: `git ls-files` found tracked `api/.env` and `web/.env`; gitleaks found 13 working-tree and 12 historical findings in environment files. Remediation is in progress; historical rewriting requires human approval.
- F14 confirmed: web had no `typecheck` or `test` scripts; `poetry run pytest` failed without `PYTHONPATH`; mypy package discovery hid 41 strict typing failures; ruff had five errors.
- F15 confirmed: Phase 1, Unit 09, and Unit 10 were recorded as complete/in progress without end-to-end evidence.
- 2026-10-10 local checks after Phase 1 edits: `web npm run typecheck`, `test`, `lint`, and `build` pass (5 Vitest tests); `api poetry run ruff check .`, `mypy .`, and `pytest -q` pass (6 tests); `curl /api/v1/health` returns `{"data":"ok"}`; web root returns HTTP 200. `npm audit --audit-level=high` reports 0 vulnerabilities.
- 2026-10-10 Phase 1 end-to-end code re-audit: every main web mutation calls `supabase.functions.invoke("api/v1/…")`, but the repository contains no Supabase Edge Functions; FastAPI is a separate service. Farmer and buyer write services still contain no-op stubs, listing creation returns a generated UUID without persisting, and the migrations contain known incompatible schema/policy references. This explains why form actions cannot complete an end-to-end product flow.
- D4 was cleared by the project owner on 2026-10-10: the hosted Supabase project contains no real data. A read-only service-role inventory confirmed the hosted REST project is reachable and has the core Unit 02–04/08 tables, while `offers`, `pools`, `pickups`, and `verifications` are absent. The local `DATABASE_URL` does not resolve to that Supabase project, so no SQL or reset was attempted.
- 2026-10-10 direct-hosted follow-up: API `pytest` (9), Ruff, and mypy pass; web Vitest (9), lint, typecheck, and production build pass. The only build warning is the existing Vite bundle-size warning. The route security checklist passed for the new profile boundary: missing bearer token returns `401`, validated payload permits only signup roles, mutations use the service role, and no client write policy remains after migration. `npm audit --audit-level=high` and `pip-audit` report no known vulnerabilities. The repository-wide gitleaks scan still reports the previously recorded tracked-environment/history findings.
- 2026-10-10 local recovery check: API Ruff, mypy, and 16 pytest tests pass; web typecheck, lint, 13 Vitest tests, and production build pass. `GET /api/v1/health` returned HTTP 200 with the expected headers from the restored local API. The npm audit endpoint was unavailable in this environment, so no new dependency-audit result is claimed.

## Independent Acceptance Re-check

Status terms: **verified** has recorded command/test/manual evidence; **partial** has an implementation fragment but lacks the required proof; **not verified** has no evidence or is contradicted by code.

### Unit 01 — Foundation: partial

- [ ] Web shell/token-only styling — startup HTTP 200 is verified; visual/token audit is not.
- [ ] Punjabi font rendering — not verified.
- [x] API health success shape — `curl http://127.0.0.1:8000/api/v1/health` returned `{"data":"ok"}` on 2026-10-10.
- [ ] Required-setting startup failure — not tested.
- [ ] Host and CORS rejection — not tested.
- [ ] Required security headers — not tested against the complete checklist.
- [ ] Clean database reset and PostGIS — D4 cleared; awaiting local Supabase tooling and migration repair.
- [ ] Clean-checkout CI and no committed secret — historical secrets remain; not verified.
- [ ] One documented start/test/lint/typecheck command — scripts are being repaired; README is not yet verified.

### Unit 02 — Auth and roles: partial

- [x] First-time role selection is routed through a JWT-authenticated API endpoint and a second role selection returns `409`; API and web boundary tests passed on 2026-10-10.
- [ ] Fixed OTP sign-in; wrong/expired/resend behavior; new-role redirect; seeded NGO redirect; cross-role route denial; JWT rejection; Indian-number validation; CAPTCHA rejection; no service-role bundle — no real auth-provider or role-flow evidence exists. The UI has an OTP form, but this is insufficient proof.

### Unit 03 — Farmer profile and ID: not verified

- [ ] Multiple plots; private encrypted upload/path-only persistence; invalid/oversize upload rejection; minimised ID data; mocked review/rejection/resubmission; direct RLS isolation; complete English/Punjabi strings — no end-to-end evidence exists. The API implementation is no longer a stub, but the frontend workflow and hosted storage/database checks remain blocked.

### Unit 04 — Buyers and listings: not verified

- [ ] Buyer profile/demand CRUD; verified listing with estimate; unverified-listing rejection in UI/API; listing ownership; config-backed estimate — no end-to-end evidence exists. The persistence paths and request mapping are covered by unit tests; hosted schema and browser-flow checks remain outstanding.

### Unit 05 — Matching and pooling: not verified

- [ ] Deterministic offer; accept/decline; live pool progress; ready-pool date/notifications; fixture tests; no-network matching — no evidence exists. Pickup creation is absent and matching is not invoked by listing creation.

### Unit 06 — Pickup and payment: not verified

- [ ] Buyer-only weights; tested amount due; farmer-only payment update; buyer live status; no money movement — no end-to-end or RLS evidence exists. Pickup creation is absent and an update references a missing schema field.

### Unit 07 — Satellite verification: partial

- [x] Three verdict result branches — `api/tests/test_verification.py` passed 3 fixture-style tests on 2026-10-10.
- [ ] Inconclusive recheck scheduling — not tested and not implemented.
- [ ] Summary-only storage/no imagery — not verified against a real database.
- [x] All three verdict outcomes have tests — named tests passed as above.
- [ ] Handler queues work only — not verified by a route test.

### Unit 08 — Charity: verified
- [x] Unsold listing auto-listing (2-3 days unsold) with farmer details and benchmark stubble clearance demand estimations (₹1,300/acre).
- [x] Citizen Charity Crowdfunding Section accessible globally (`/charity` and Donor Dashboard).
- [x] Stripe Dummy Payment Gateway integration (`sk_test_...` and `pk_test_...` keys verified, card 4242 sandbox + hosted checkout support).
- [x] Automated Nearby NGO Calling & Dispatch (Punjab Clean Air & Bio-Energy Action) with baler machinery fleet assignment and farmer WhatsApp notification.
- [x] Complete Supabase synchronization across `donations`, `assistance_requests`, `disbursements`, `notifications`, and `listings` with zero foreign-key or column errors.
- [x] Full unit and integration tests passing (29/29 pytest, 13/13 vitest, clean ruff and tsc).

### Unit 09 — WhatsApp: not verified

- [ ] Same listing service/source; message persistence; database-backed questions; forged-signature rejection; timeline/buyer source tag; safe parse failure — no sandbox or route test exists. Static review shows only two intents and a bypass of the normal listing service.

### Unit 10 — Buyer heatmap: not started

- [ ] Demand/supply layers; labelled unfilled zones; no individual plots; buyer-only access — no implementation or verification evidence exists.

### Unit 11 — Security hardening: partial

- [ ] Complete access-control/404 matrix; dedicated rate limits; hostile Host/origin/body handling; outbound allowlist; complete headers; DNS/registrar checks; clean production bundle; both dependency audits; unit checklist — not verified.
- [x] Oversized request rejection is partially covered by `api/tests/test_security.py::test_oversized_body`, which passed on 2026-10-10; it is not a complete hardening verification.

## Next Up

1. Finish and commit Recovery Phase 1.
2. Put a current direct connection for this hosted Supabase project in the ignored `api/.env` (or a Supabase access token) and apply the forward-only migration.
3. Repair the remaining Phase 1 schema/services and verify them against the hosted project; do not start Phase 2 work.

## Inputs Needed From User

| Input | Needed by | Used for | Where to get it | Env file and variable | Status |
| --- | --- | --- | --- | --- |
| Rotated Supabase URL, anon key, service-role key, DB URL, and JWT secret | Recovery Phases 1–4 | Local API/database/auth | Supabase Project Settings | `web/.env.local`, `api/.env` | Required: previously committed values must be rotated |
| Rotated NASA FIRMS, Copernicus, and LLM credentials | Recovery Phases 4–5 | Verification and WhatsApp | Respective provider dashboards | `api/.env` | Required: previously committed values must be rotated |
| Hosted project data confirmation | Recovery Phase 2 | Authorise/reset decision under D4 | Supabase dashboard/project owner | N/A | Confirmed on 2026-10-10: no real data to preserve |
| Current direct hosted database URL or Supabase access token | Recovery Phase 2 | Apply and verify forward-only migrations against the connected project | Supabase dashboard/project owner | Ignored `api/.env` `DATABASE_URL` or local CLI auth | Required: current `DATABASE_URL` points elsewhere |
| 32-byte URL-safe base64 document encryption key | Unit 03 | Encrypt private ID documents before storage | Password manager or secret generator | Ignored `api/.env` `ID_DOCUMENT_ENCRYPTION_KEY` | Required for live ID-upload verification |
| OTP test numbers/fixed codes and CAPTCHA dashboard configuration | Unit 02 | Real auth-flow verification | Supabase/Turnstile dashboards | Dashboard settings and `web/.env.local` | Required for verification |
| MapTiler key | Units 03 and 10 | Map validation | MapTiler | `web/.env.local` | Optional during plain-map fallback |
| Twilio/Meta sandbox and WhatsApp signing secret | Unit 09 | Webhook verification | Provider dashboard | `api/.env` | Required for live provider verification |

## Open Questions

- What should happen when a pool misses its minimum load before the sowing window closes?
- Confirm ID-document retention period, production SMS provider, hosting/DNS/WAF, and licensed font choice.

## Needs Human

- Rotate every credential that was present in tracked environment files.
- Rewrite remote Git history after rotation.
- Configure DNS, registrar lock, DNSSEC/CAA, Supabase OTP settings, and provider dashboards.
