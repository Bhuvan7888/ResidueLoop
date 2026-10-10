# Development Workflow

## Approach

Build this project incrementally using a spec-driven workflow. Context files define what to build, how to build it, and what the current state of progress is. Always implement against these specs. Do not infer or invent behavior from scratch.

## How To Work A Unit

When told to build a unit (for example "build featureSpecs/05-matching-and-pooling.md"):

1. Read `AGENTS.md`, then `project-overview.md`, `architecture-context.md`, `design.md`, `code-standards.md`, `security-context.md`, `progress-tracker.md`, and the named feature spec.
2. State the unit's scope and acceptance criteria back in a few lines before writing code.
3. Implement only that unit.
4. Run the checks (typecheck, lint, tests) and walk through every acceptance criterion in the spec.
5. Update `progress-tracker.md`.
6. Report which acceptance criteria passed, how each was checked, and anything left open.

## Definition Of Done

A unit is done only when all of these are true:

- Every acceptance criterion in its feature spec is met and was actually checked, not assumed. A criterion that cannot be checked without an input from the user is marked "blocked on input" and listed in `progress-tracker.md`. The unit is then "done pending input", and it is fully done only after the input arrives and that criterion passes.
- Typecheck, lint, and tests pass.
- No item in `project-overview.md` Out Of Scope was added.
- No invariant in `architecture-context.md` was violated.
- The security checklist in `security-context.md` passes for this unit, including at least one negative test.
- The code follows `code-standards.md`: no dead code, no duplicated logic, no unused dependencies, within the size limits.
- Anything mocked is behind a config flag and marked `MOCK:`.
- `progress-tracker.md` reflects the real state.

Do not report a unit as done if any criterion is unmet or unchecked. Say which ones and why.

A criterion is recorded as passed only with evidence: command output, a named test, or a recorded manual walk of the real flow, written next to the criterion in `progress-tracker.md`. Statuses are never copied from earlier text. An independent re-check of earlier units runs before any new unit starts.

## Scoping Rules

- Work on one feature unit or subsystem at a time.
- Prefer small, verifiable increments over large speculative changes.
- Do not combine unrelated system boundaries in a single implementation step.

## When To Split Work

Split an implementation step if it combines:

- UI changes and background task changes
- Database schema or row level security changes and unrelated UI work
- Multiple unrelated API routes
- Web behavior and WhatsApp behavior
- Behavior that is not clearly defined in the context files

If a change cannot be verified end to end quickly, the scope is too broad. Split it.

## Handling Missing Requirements

- Do not invent product behavior that is not defined in the context files.
- If a requirement is ambiguous, resolve it in the relevant context file before implementing.
- If a requirement is missing, add it as an open question in `progress-tracker.md` before continuing.
- If a request conflicts with Out Of Scope, stop and ask. Do not build it.

## Inputs Needed From The User

Some work needs something only the user can provide: Supabase credentials, API keys, provider setup, or an optional Google Cloud Translation API key. Never stop the build for these.

1. **Record it.** Add the variable name to `.env.example` and a row to "Inputs Needed From User" in `progress-tracker.md`.
2. **Use a fallback and keep building.**
   - Supabase: run local Supabase with the CLI (`supabase start`) and its local keys. If Docker is not available, write the migrations and tests anyway and mark the database checks blocked.
   - OTP: test phone numbers with fixed OTPs in the local config.
   - CAPTCHA: the provider's published test keys in development.
   - NASA FIRMS and Sentinel: fixture mode behind a config flag, marked `MOCK:`.
   - Map tiles: a plain light background with markers until the tile key arrives.
   - Punjabi strings: write them yourself and list them in `progress-tracker.md` for native review. A Google Cloud Translation key is optional and only for a dev-time script that drafts or cross-checks strings. It is never shipped in the app.
   - WhatsApp and LLM (Phase 2): recorded payload fixtures and a fake parser until the keys arrive.
3. **Mark it.** Criteria that need the input are "blocked on input", never "passed".
4. **Ask at the right time.** At the end of each unit, give a short list: input, env file and variable, where to get it, and which criteria it unblocks. Give the full list in the final report.
5. **Never ask for secrets in chat.** The user puts values in the env files and says so. Then re-run the blocked criteria first, mark them, and update the tracker.

## Protected Foundation Components

Do not modify generated third-party foundation components unless explicitly instructed.

This includes:

- `web/src/components/ui/*` (shadcn/ui components)
- third-party library internals
- applied migrations in `supabase/migrations` (add a new migration instead)

These should remain default and reusable.

Project-specific styling, layout changes, and feature logic must be implemented in app-level components instead of modifying foundation components.

Only modify these files when a task explicitly requires it.

## Keeping Docs In Sync

Update the relevant context file whenever implementation changes:

- System architecture or boundaries
- Storage model decisions
- Code conventions or standards
- Design tokens or layout patterns
- Feature scope

Progress state must reflect the actual state of the implementation, not the intended state.

## Before Moving To The Next Unit

1. The current unit works end to end within its defined scope.
2. No invariant defined in `architecture-context.md` was violated.
3. `progress-tracker.md` reflects the completed work.
