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

## Scripts

- **Start**:
  - Web: `cd web && npm run dev`
  - API: `cd api && uvicorn app.main:app --reload`
- **Test**:
  - Web: `cd web && npm run test`
  - API: `cd api && pytest`
- **Lint**:
  - Web: `cd web && npm run lint`
  - API: `cd api && ruff check .`
- **Typecheck**:
  - Web: `cd web && npm run typecheck`
  - API: `cd api && mypy .`

For more detailed project specifications, see the [context/](context/) directory.
