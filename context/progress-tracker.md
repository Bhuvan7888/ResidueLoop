# Progress Tracker

This tracker records verified evidence only. Earlier completion claims were independently re-checked on 2026-10-10 and are not carried forward without evidence.

## Current Phase

- Recovery Phase 1: Secrets, CI, and reality report — complete pending human credential rotation and history rewrite.
- Recovery Phase 2 is gated: do not reset Supabase until the hosted project's data state is confirmed.

## Current Goal

- Confirm the hosted Supabase project contains no real data before the one-time migration reset (D4).
- Deliver an original, token-based public landing and consistent auth/workspace shell without changing the blocked database plan.

## Frontend Experience Refresh — 2026-10-10

- [x] Added a public `/` landing route and moved the protected dashboard route to `/app`; sign-in, role selection, and authenticated redirects now target `/app`.
- [x] Added an original SVG field/straw illustration, editorial landing sections, responsive navigation, token-only styling, CSS-only motion, and a `prefers-reduced-motion` fallback. No reference-site assets or fonts were copied.
- [x] Refreshed login, role-picker container, protected header, language switch, and dashboard heading to use the shared editorial treatment.
- [x] Added English and Punjabi strings for all new landing, navigation, login, language, and OTP-resend UI.
- [x] Verified static quality with `cd web && npm run typecheck && npm run lint && npm run test && npm run build` (5 Vitest tests passed) on 2026-10-10.
- [ ] Browser visual and live authentication-flow QA remain unverified: the controlled browser runtime was unavailable and real OTP/provider credentials are still required.

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
- Database, RLS, and pgTAP checks are blocked: Supabase CLI is not installed yet, and the D4 hosted-data gate has not been cleared.

## Independent Acceptance Re-check

Status terms: **verified** has recorded command/test/manual evidence; **partial** has an implementation fragment but lacks the required proof; **not verified** has no evidence or is contradicted by code.

### Unit 01 — Foundation: partial

- [ ] Web shell/token-only styling — startup HTTP 200 is verified; visual/token audit is not.
- [ ] Punjabi font rendering — not verified.
- [x] API health success shape — `curl http://127.0.0.1:8000/api/v1/health` returned `{"data":"ok"}` on 2026-10-10.
- [ ] Required-setting startup failure — not tested.
- [ ] Host and CORS rejection — not tested.
- [ ] Required security headers — not tested against the complete checklist.
- [ ] Clean database reset and PostGIS — blocked on Supabase CLI/D4 gate.
- [ ] Clean-checkout CI and no committed secret — historical secrets remain; not verified.
- [ ] One documented start/test/lint/typecheck command — scripts are being repaired; README is not yet verified.

### Unit 02 — Auth and roles: not verified

- [ ] Fixed OTP sign-in; wrong/expired/resend behavior; new-role redirect; seeded NGO redirect; cross-role route denial; JWT rejection; Indian-number validation; CAPTCHA rejection; no service-role bundle — no real auth-provider or role-flow evidence exists. The UI has an OTP form, but this is insufficient proof.

### Unit 03 — Farmer profile and ID: not verified

- [ ] Multiple plots; private encrypted upload/path-only persistence; invalid/oversize upload rejection; minimised ID data; mocked review/rejection/resubmission; direct RLS isolation; complete English/Punjabi strings — no end-to-end evidence exists. The farmer write services remain stubs.

### Unit 04 — Buyers and listings: not verified

- [ ] Buyer profile/demand CRUD; verified listing with estimate; unverified-listing rejection in UI/API; listing ownership; config-backed estimate — no end-to-end evidence exists. Buyer and listing write services are stubs.

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

### Unit 08 — Charity: not verified

- [ ] Donation/history; support request visibility; NGO approval/disbursement/ledger; donor verification notification; village-only location; “likely influence” language; no money movement — no end-to-end evidence exists. Allocation and concurrency rules are absent.

### Unit 09 — WhatsApp: not verified

- [ ] Same listing service/source; message persistence; database-backed questions; forged-signature rejection; timeline/buyer source tag; safe parse failure — no sandbox or route test exists. Static review shows only two intents and a bypass of the normal listing service.

### Unit 10 — Buyer heatmap: not started

- [ ] Demand/supply layers; labelled unfilled zones; no individual plots; buyer-only access — no implementation or verification evidence exists.

### Unit 11 — Security hardening: partial

- [ ] Complete access-control/404 matrix; dedicated rate limits; hostile Host/origin/body handling; outbound allowlist; complete headers; DNS/registrar checks; clean production bundle; both dependency audits; unit checklist — not verified.
- [x] Oversized request rejection is partially covered by `api/tests/test_security.py::test_oversized_body`, which passed on 2026-10-10; it is not a complete hardening verification.

## Next Up

1. Finish and commit Recovery Phase 1.
2. Confirm whether the hosted Supabase project contains any real data before running `supabase db reset` (D4 gate).
3. Recovery Phase 2: repair migrations and replace client write RLS with SELECT-only access.

## Inputs Needed From User

| Input | Needed by | Used for | Where to get it | Env file and variable | Status |
| --- | --- | --- | --- | --- |
| Rotated Supabase URL, anon key, service-role key, DB URL, and JWT secret | Recovery Phases 1–4 | Local API/database/auth | Supabase Project Settings | `web/.env.local`, `api/.env` | Required: previously committed values must be rotated |
| Rotated NASA FIRMS, Copernicus, and LLM credentials | Recovery Phases 4–5 | Verification and WhatsApp | Respective provider dashboards | `api/.env` | Required: previously committed values must be rotated |
| Hosted project data confirmation | Recovery Phase 2 | Authorise/reset decision under D4 | Supabase dashboard/project owner | N/A | Required before any reset |
| OTP test numbers/fixed codes and CAPTCHA dashboard configuration | Unit 02 | Real auth-flow verification | Supabase/Turnstile dashboards | Dashboard settings and `web/.env.local` | Required for verification |
| MapTiler key | Units 03 and 10 | Map validation | MapTiler | `web/.env.local` | Optional during plain-map fallback |
| Twilio/Meta sandbox and WhatsApp signing secret | Unit 09 | Webhook verification | Provider dashboard | `api/.env` | Required for live provider verification |

## Open Questions

- Does the hosted Supabase project contain any real user, plot, document, listing, donation, or payment-status data? This must be answered before D4 reset work.
- What should happen when a pool misses its minimum load before the sowing window closes?
- Confirm ID-document retention period, production SMS provider, hosting/DNS/WAF, and licensed font choice.

## Needs Human

- Rotate every credential that was present in tracked environment files.
- Rewrite remote Git history after rotation; do not reset the hosted database until its data state is confirmed.
- Configure DNS, registrar lock, DNSSEC/CAA, Supabase OTP settings, and provider dashboards.
