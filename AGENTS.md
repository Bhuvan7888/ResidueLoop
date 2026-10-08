# AGENTS.md

Instructions for any AI coding agent working on ResidueLoop.

## Read First, In This Order

1. `context/project-overview.md` — what the product is, who uses it, user flows, scope, and out of scope
2. `context/architecture-context.md` — stack, boundaries, storage, data model, invariants
3. `context/design.md` — theme, tokens, layout, components
4. `context/code-standards.md` — how code is written, kept lean, and organised
5. `context/security-context.md` — security rules and the per-unit checklist
6. `context/ai-workflow-rules.md` — how to work a unit, and the definition of done
7. `context/progress-tracker.md` — current state and open questions
8. The feature spec you were asked to build in `context/featureSpecs/`

## Rules

- Build only the unit you were asked to build.
- Do not invent behavior. If something is missing or ambiguous, add it to Open Questions in `progress-tracker.md` and ask.
- Do not build anything listed under Out Of Scope in `project-overview.md`.
- Do not start Phase 2 or Phase 3 work during Phase 1.
- Use design tokens only. No hardcoded colors.
- Write lean code: no dead code, no duplicated logic, no speculative features, no unneeded dependencies.
- Apply the security checklist to every unit.
- Never stop for a missing key or credential. Use the fallbacks and the "Inputs Needed From The User" process in `context/ai-workflow-rules.md`, and ask the user at the end of the unit and in the final report.
- Never store a full ID number. Never expose the Supabase service role key to the browser.
- Do not modify `web/src/components/ui/*` or applied migrations.

## Finishing

Do not say a unit is done until every acceptance criterion in its spec has been checked and `progress-tracker.md` is updated. A criterion that needs the user's input is reported as blocked on input, never as passed. Report each criterion as passed or not, and how you checked it.
