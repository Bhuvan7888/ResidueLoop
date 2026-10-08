Read the 'AGENTS.md' before starting

# Unit 01: Foundation

## Goal

A running web app, API, and Supabase project with the design system, tooling, and baseline security in place, and nothing else.

## Depends On

None.

## Build

- Repo layout exactly as in `code-standards.md`: `web/`, `api/`, `supabase/`, `context/`, plus `README.md`, `.editorconfig`, `.env.example`, and `.github/workflows/ci.yml`.
- Vite React TypeScript app in strict mode with Tailwind and shadcn/ui initialised, TanStack Query, react-hook-form, zod, and react-i18next (English and Punjabi files).
- Design tokens from `design.md` in `web/src/styles/index.css`, mapped with `@theme inline`. Fonts self-hosted: display serif and sans stand-ins, Noto Sans Gurmukhi, Noto Serif Gurmukhi.
- Navbar shell and an empty protected layout. Shared `cn()`, `StatusBadge`, `EmptyState`, and `PageHeader` components.
- Supabase project config, local setup, a first migration that enables PostGIS, and a shared `updated_at` trigger.
- FastAPI app with a health route, the standard error shape, request ID logging with phone masking, a validated settings class, and the JWT-verification dependency (not yet used).
- Baseline security from `security-context.md`: security headers in `web/vercel.json` and API middleware, `TrustedHostMiddleware`, CORS allowlist, rate limiting middleware, body size limit, disabled API docs in production.
- Tooling: ESLint, Prettier, ruff, mypy, pytest, Vitest, pre-commit hooks with gitleaks, and CI running lint, typecheck, tests, dependency audit, and a bundle check for secrets.
- `.env.example` with names only, for web and api.
- `README.md` with project summary, folder structure, setup, scripts, and a link to `context/`.

## Not In This Unit

Login screens, any table beyond PostGIS, any feature screen.

## Acceptance Criteria

- [ ] `web` starts, shows the shell on `bg-base`, and uses only token classes.
- [ ] Punjabi text renders in Noto Sans Gurmukhi, and Punjabi headings in Noto Serif Gurmukhi.
- [ ] `api` health route returns the standard success shape and nothing else.
- [ ] `api` refuses to start when a required setting is missing.
- [ ] A request with an unknown `Host` header is rejected. A request from a non-allowlisted origin gets no CORS approval.
- [ ] Responses carry the security headers listed in `security-context.md`.
- [ ] `supabase db reset` applies the migration cleanly and PostGIS is enabled.
- [ ] CI passes on a clean checkout. No real secret is committed.
- [ ] One command each starts, tests, lints, and typechecks the project, and `README.md` documents them.

## Verify

Run CI locally, start both apps, send a request with a bad `Host` header, and search the web source for hardcoded hex values and raw color classes.
