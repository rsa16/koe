# koe - Headless Commenting System

This is a greenfield project. The codebase is currently transitioning from the design phase to the implementation phase.

## Architecture & Domain Constraints

- **Terminology**: Strict adherence to `CONTEXT.md` is required. Use these exact terms in all code, tests, and discussions. Do not invent synonyms.
- **Design & Specs**: See `spec.md` for the full feature set, testing seam expectations (API boundary only), and out-of-scope items.
- **Decisions**: Check `docs/adr/` for architectural decision records (e.g., cross-origin hybrid auth) before proposing design changes.

## Workflow & Implementation

- **Tickets**: The implementation is broken down into tracer-bullet vertical slices located in `.scratch/headless-comments/issues/`.
- **Execution**: Implement tickets sequentially, starting from `01`. Each ticket must be fully vertical and testable. Do not attempt wide horizontal scaffolding beyond what a ticket asks for.
- **Target Stack**: `pnpm` Turborepo containing Fastify (`server`), Drizzle ORM (`db`), Lit (`widget`), and React + MUI (`admin`).

## Agent Skills

### Issue tracker
Issues theoretically live in GitHub Issues (`gh`), but are currently staged locally in `.scratch/` until the remote is established. See `docs/agents/issue-tracker.md`.

### Triage labels
The triage label vocabulary uses the default roles. See `docs/agents/triage-labels.md`.

### Domain docs
This repo uses a single-context layout for domain docs. See `docs/agents/domain.md`.