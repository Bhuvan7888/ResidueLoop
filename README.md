# ResidueLoop

ResidueLoop is a web platform that helps Punjab farmers sell paddy straw instead of burning it.

## Folder Structure

- `web/`: React + TypeScript frontend (Vite)
- `api/`: FastAPI backend
- `supabase/`: Database migrations, tests, and seed data
- `context/`: Project specifications and source of truth

## Setup

1. Copy `.env.example` to `.env` in both `web/` and `api/` directories and fill in the values.
2. For the frontend: `cd web && npm install`
3. For the backend: `cd api && poetry install`
4. For the database: `supabase start`

### Hosted Supabase demo setup

The hosted project must have the Phase 1 schema before the app can show reference data or persist the farmer flow. In the Supabase SQL Editor, run these files in order:

1. `supabase/migrations/20261010000000_profile_mutation_boundary.sql`
2. `supabase/migrations/20261010000001_phase1_schema_repair.sql`

The second migration creates the missing Phase 1 tables, private `id-documents` bucket, and reference villages and balers. It is safe to run once on the cleared hosted project. Do not insert rows into `auth.users` manually: create test accounts through Supabase Phone Auth so their OTP session and JWT are valid. Configure Supabase test phone numbers and fixed codes in the Auth dashboard, then sign in once as a farmer and once as a buyer. The farmer can complete the visible setup flow; the buyer saves its profile and demand before the farmer creates a listing.

For encrypted ID proof uploads, put a 32-byte URL-safe base64 value in `api/.env` as `ID_DOCUMENT_ENCRYPTION_KEY` and restart the API. In mock review, an ID ending in `0000` is rejected; every other valid four-digit ending is marked verified.

## Scripts

- **Start**:
  - Web: `cd web && npm run dev`
  - API: `cd api && poetry run uvicorn app.main:app --reload --port 8000`
- **Test**:
  - Web: `cd web && npm run test`
  - API: `cd api && poetry run pytest`
- **Lint**:
  - Web: `cd web && npm run lint`
  - API: `cd api && poetry run ruff check .`
- **Typecheck**:
  - Web: `cd web && npm run typecheck`
  - API: `cd api && poetry run mypy app`

For more detailed project specifications, see the [context/](context/) directory.

## DNS Security Checklist (Unit 11)

Deployment settings are not verifiable from this repository. Complete and record these in the registrar and hosting consoles before production:

- [ ] Registrar lock and 2FA enabled
- [ ] DNSSEC enabled where supported
- [ ] CAA records configured
- [ ] No dangling or wildcard records
- [ ] HTTPS only with HSTS
- [ ] API origin locked to the CDN or WAF
