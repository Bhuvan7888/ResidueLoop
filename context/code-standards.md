# Code Standards

Write the least code that meets the acceptance criteria, in the place where a reader would look for it. Security rules are in `security-context.md` and apply on top of this file.

## Lean Code

- Build only what the current unit's acceptance criteria require. No speculative features, options, or extension points.
- No dead code, unused imports, unused parameters, unused exports, or commented-out code. Delete it.
- No `TODO` in code. If something is deferred, add it to `progress-tracker.md`.
- Prefer the library or platform feature over custom code: shadcn/ui, react-hook-form with zod, TanStack Query, Pydantic, Supabase client, `date-fns`. Do not hand-roll what they already do.
- Add a dependency only when it removes more code than it adds. Check the existing dependencies first. Pin versions and commit lockfiles.
- Prefer pure functions, small modules, early returns, and immutable data. Avoid classes unless the framework needs them.
- Limits: function 40 lines, React component 150 lines, file 300 lines, 4 parameters (use an object beyond that), 3 levels of nesting. Split when a limit is passed.
- Comments explain why, never what. A docstring only on public service functions. Rename instead of commenting.

## No Repetition (DRY)

- Single source of truth. Define each enum, status value, role, limit, and threshold once:
  - Database enums are the source. TypeScript types are generated from the schema. Python enums mirror them in one `enums.py`.
  - Tunable numbers (tonnes per acre, minimum load, NBR threshold, rate limits) live in one config module per app, never as literals.
  - User-facing strings live in the i18n files only.
- Rule of three: duplication twice is tolerated. On the third use, extract it. Never copy more than 5 lines.
- One shared module per concern: one API client, one Supabase client, one `cn()` helper, one date and number formatter, one error mapper, one pagination helper.
- Shared UI patterns become one component in `components/common/` (for example `StatusBadge` for every status, `EmptyState`, `PageHeader`). Do not restyle the same pattern in several screens.
- Forms: one zod schema per form, reused for client validation and for the matching API request model's tests. Field components are reused.
- Do not create a util that is used once. Do not create a base class to share two lines.

## Naming And Style

- Intention-revealing names. Functions are verbs, booleans start with `is`, `has`, `can`, or `should`. Avoid abbreviations except `id`, `url`, `db`.
- Web files: `kebab-case.ts`, components `PascalCase.tsx`, hooks `use-thing.ts` exporting `useThing`. Python files and functions: `snake_case`. Database: plural `snake_case` tables, `snake_case` columns.
- Absolute imports with the `@/` alias in the web app and package imports in Python. No `../../..` chains.
- No circular imports. A feature exposes its public API through its `index.ts`. Other features import only from that index.
- Formatting is automatic: Prettier and ESLint for web, ruff for Python, `.editorconfig` for the rest. Do not hand-format.
- Conventional Commit messages (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`). One logical change per commit.

## TypeScript

- Strict mode is required throughout the project.
- Avoid `any` and non-null assertions (`!`). Use explicit interfaces or narrowly scoped types. Use `interface` for object contracts and `type` for unions.
- Validate unknown external input at system boundaries (form input, API responses, URL params) with a zod schema before trusting it.
- Generate database types from the Supabase schema. Do not hand-write row types.
- Prefer `unknown` over `any` for caught errors and narrow them.
- Exhaustive `switch` on unions with a `never` check for statuses and roles.

## React

- Function components only. A component does one job. Presentational components receive props. Data fetching lives in feature hooks.
- Server state goes through TanStack Query only. Do not scatter `fetch` calls or copy server data into local state.
- Local state is for UI state only. Derive values during render. Do not use `useEffect` to sync derived state. Memoize only after a measured need.
- Every data view handles loading (skeleton), empty (`EmptyState`), and error states.
- Forms use react-hook-form with a zod resolver. Disable submit while pending. Show inline errors next to fields.
- Accessibility: every input has a visible label, every icon-only button has an `aria-label`, focus order is logical, and all actions work from the keyboard.
- Every user-facing string goes through react-i18next. No hardcoded English or Punjabi in components.
- No inline `style` props. Use token classes. No `dangerouslySetInnerHTML`.
- Route-level code splitting with lazy routes. Map code loads only on map pages.

## Python (api)

- Python 3.11. Type hints on every function. mypy strict and ruff must pass.
- Layers, one direction only: router, then service, then repository. Routers parse input and call one service. Services hold business rules. Repositories are the only code that touches the database.
- Pydantic v2 models for every request, response, and settings object. Request models forbid extra fields.
- Settings come from one `pydantic-settings` class, validated at startup. The app refuses to start if a required secret is missing.
- Dependencies (current user, database session, settings) are injected with FastAPI `Depends`. No module-level mutable state.
- Use `async` for I/O. Never block the event loop with a satellite or LLM call inside a request.
- Raise typed domain errors in services. One exception handler maps them to the standard error shape. No bare `except`, no swallowed exceptions.
- Outbound HTTP goes through one shared client in `integrations/` with timeouts, retries with backoff, and the host allowlist. Validate third-party responses with schemas.
- Background jobs are idempotent: running the same job twice produces the same result.

## Database And Supabase

- Schema changes are SQL migrations in `supabase/migrations`, one concern per migration. Never edit an applied migration. Never change the schema in the dashboard.
- Primary keys are `uuid`. Every table has `created_at`, and `updated_at` where rows change, maintained by one shared trigger.
- Use enums or check constraints for statuses. Add NOT NULL, foreign keys, and indexes on every foreign key.
- Row level security is enabled on every table, default deny, with one policy per role that needs access. Policies use a shared helper function for the current role.
- Queries are parameterised. No string-built SQL. No `select *`; name the columns you need. Paginate every list query.
- Multi-row writes happen in one transaction.
- Every RLS policy has a pgTAP test for each role in the access table.
- Seed data lives in `supabase/seed.sql` only.

## API Conventions

- Routes are versioned under `/api/v1` and named by resource (`/listings`, `/pools/{id}/pickups`). Use the correct HTTP verb and status code.
- All web mutations use the shared FastAPI client. Do not use Supabase Edge Functions or client-side database writes.
- Direct browser reads are performed only through feature hooks backed by TanStack Query; components never fetch in `useEffect`.
- Validate and parse request input before any logic runs. Then authenticate, then authorise by role and ownership, then act.
- Consistent response shapes: `{ "data": ... }` on success and `{ "error": { "code": "...", "message": "..." } }` on failure. List responses add `{ "page": { "next": ... } }`.
- Error codes are a fixed enum shared with the web app. Messages never expose internals.
- Mutations that create records accept an idempotency key.
- Keep route handlers thin. One responsibility per route.

## Styling

- Use CSS custom property tokens defined in `index.css`. No raw Tailwind color classes like `zinc-*` and no hardcoded hex values.
- Reference tokens through their Tailwind utility names listed in `design.md`.
- Maintain the border radius scale: `rounded-xl` for small elements, `rounded-2xl` for cards, `rounded-3xl` for modals.
- Never show status with color alone. Pair every status color with an icon and text.
- Compose classes with `cn()`. No duplicated long class strings: extract a component instead.

## Data And Storage

- Project metadata and relationships belong in Supabase Postgres.
- ID documents belong in the private Supabase Storage bucket `id-documents`. The database stores only the path.
- Never store a full ID number. Store the ID type, last four digits, and status.
- Never expose the service role key to the browser. Only the anon key goes to the client.
- Secrets live in environment variables. Commit `.env.example` with names only.
- Do not store large generated content directly in the database.

## Mocked Behavior

- Anything mocked (ID review, payments, OTP test numbers) is controlled by a named config flag and marked with a `MOCK:` comment at the point of the mock.
- Mocks sit behind the same function signature the real integration will use, so replacing them touches one module.

## Logging And Errors

- Structured JSON logs with a request ID on every line. Levels used correctly.
- Never log phone numbers in full (mask as `+91******1234`), OTPs, tokens, secrets, ID data, or document contents.
- Fail fast on invalid state. User-facing errors are short, translated, and say what to do next.

## Testing

- Verification verdict rules, matching score, pooling, and amount-due calculation have unit tests with fixed fixtures.
- Services are tested without the network. Third-party calls are replaced at the `integrations/` boundary.
- Web: Vitest for hooks and utilities, Playwright for one smoke path per role.
- Test names describe behavior. One behavior per test. No test depends on another.
- Each feature unit has at least one end-to-end check that follows its acceptance criteria.

## Tooling And Automation

- One command each to start, test, lint, and typecheck the whole project, documented in `README.md`.
- Pre-commit hooks run formatters, linters, and a secret scan (gitleaks).
- CI on every pull request: lint, typecheck, unit tests, RLS tests, dependency audit (`npm audit`, `pip-audit`), and a check that the web build contains no service role key.
- Dependabot or Renovate for dependency updates. `main` is protected and requires CI to pass.
- `README.md` covers: what the project is, folder structure, setup, environment variables, scripts, and a link to `context/`.

## File Organization

```
residueloop/
├─ AGENTS.md
├─ README.md
├─ .env.example
├─ .editorconfig
├─ .github/workflows/ci.yml
├─ context/                      Project specs (source of truth)
├─ supabase/
│  ├─ migrations/                SQL migrations, one concern each
│  ├─ tests/                     pgTAP tests for RLS
│  ├─ seed.sql
│  └─ config.toml
├─ web/
│  ├─ vercel.json                Security headers
│  └─ src/
│     ├─ app/                    Router, providers, layouts, route guards
│     ├─ features/               One folder per domain
│     │  ├─ auth/                components/, hooks/, api.ts, schemas.ts, index.ts
│     │  ├─ farmer/              Profile, plots, ID verification
│     │  ├─ listings/
│     │  ├─ pools/
│     │  ├─ pickups/
│     │  ├─ verification/
│     │  ├─ charity/             Donor and NGO
│     │  └─ whatsapp/            Phase 2
│     ├─ components/
│     │  ├─ ui/                  shadcn components (protected)
│     │  └─ common/              Shared project components
│     ├─ lib/                    supabase client, api client, cn, format
│     ├─ i18n/                   en and pa translation files
│     ├─ styles/index.css        Tokens
│     ├─ assets/decor/           Decorative SVGs
│     └─ types/                  Generated database types
└─ api/
   ├─ pyproject.toml
   ├─ app/
   │  ├─ main.py
   │  ├─ core/                   config, security, errors, logging, deps, enums
   │  ├─ routers/v1/             One file per resource
   │  ├─ services/               Business rules
   │  ├─ repositories/           Database access only
   │  ├─ schemas/                Pydantic models
   │  ├─ integrations/           firms, sentinel, open_meteo, whatsapp (shared HTTP client here)
   │  └─ jobs/                   Background tasks (run as a second process using the same services)
   └─ tests/
```

- A feature folder is self-contained: its components, hooks, API calls, and schemas live together and are exposed through `index.ts`.
- Shared code moves to `components/common/` or `lib/` only when a second feature needs it.
- The background worker is a second process of the `api` package. It reuses services and repositories, so no logic is duplicated.
- Name files after the responsibility they contain, not the technology.
