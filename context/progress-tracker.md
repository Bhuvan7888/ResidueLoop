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
2. Put a current direct connection for this hosted Supabase project in the ignored `api/.env` (or a Supabase access token) and apply the forward-only migration.
3. Repair the remaining Phase 1 schema/services and verify them against the hosted project; do not start Phase 2 work.

## Inputs Needed From User

| Input | Needed by | Used for | Where to get it | Env file and variable | Status |
| --- | --- | --- | --- | --- |
| Rotated Supabase URL, anon key, service-role key, DB URL, and JWT secret | Recovery Phases 1–4 | Local API/database/auth | Supabase Project Settings | `web/.env.local`, `api/.env` | Required: previously committed values must be rotated |
| Rotated NASA FIRMS, Copernicus, and LLM credentials | Recovery Phases 4–5 | Verification and WhatsApp | Respective provider dashboards | `api/.env` | Required: previously committed values must be rotated |
| Hosted project data confirmation | Recovery Phase 2 | Authorise/reset decision under D4 | Supabase dashboard/project owner | N/A | Confirmed on 2026-10-10: no real data to preserve |
| Current direct hosted database URL or Supabase access token | Recovery Phase 2 | Apply and verify forward-only migrations against the connected project | Supabase dashboard/project owner | Ignored `api/.env` `DATABASE_URL` or local CLI auth | Required: current `DATABASE_URL` points elsewhere |
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
