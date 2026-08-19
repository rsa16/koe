# koe - Headless Commenting System

Self-hosted headless commenting backend (Fastify + Drizzle ORM + PostgreSQL) with Lit web component and React/MUI admin UI.

## Architecture & Domain Constraints

- **Terminology**: Strict adherence to `CONTEXT.md` is required. Use exact domain terms (`Thread`, `Comment`, `Identity`, `User`, `Vote`, `Reaction`, `Report`, etc.) in all code, tests, and API payloads. Never invent synonyms.
- **Design & Specs**: See `spec.md` for feature requirements, testing seam expectations (API boundary only), and out-of-scope items.
- **Decisions**: Check `docs/adr/` before proposing design changes (e.g. `0001-hybrid-cross-origin-auth.md` for bearer vs cookie auth).
- **Errors**: RFC 9457 Problem Details (`application/problem+json`) on all API endpoints.

## Monorepo Layout

- `packages/core`: Shared Zod schemas, TypeScript types, and event definitions (contracts consumed by server & SDK).
- `packages/db`: Drizzle ORM schema, migration SQL (`drizzle/`), migration runner (`src/migrate.ts`), and PGlite in-memory test DB (`src/mem.ts`).
- `packages/auth`: Bearer access-token signing/verification and admin session-cookie logic.
- `packages/server`: Fastify REST API (`/api/v1` and un-prefixed aliases).
- `apps/`: Planned web widget (Lit) and admin dashboard (React + MUI).

## Development & Testing Commands

Build artifact dependency: `@koe/server` depends on `@koe/core`, `@koe/db`, and `@koe/auth` via built `dist/` outputs. Always run builds in dependency order (`turbo run build` handles this).

```bash
# Build all workspaces
npm run build

# Typecheck all workspaces (builds dependencies first)
npm run typecheck

# Run test suites across all packages (Vitest)
npm run test

# Run a single package or test file
npm --workspace=@koe/server test
npx vitest run packages/server/test/threads.test.ts

# Dev live-reload (Turborepo watch mode)
npm run dev

# Drizzle migrations
npm --workspace=@koe/db run db:generate   # Generate migration from schema changes
npm --workspace=@koe/db run db:migrate    # Run migrations against $DATABASE_URL
```

## Testing Seams & Environment Quirks

- **Seam**: Public REST API boundary. Test external behavior (status codes, Problem Details format, observable state via subsequent API calls), not internal DB tables directly.
- **Postgres in Tests**: Fast unit/integration tests run against `@electric-sql/pglite` in-memory (`createMemDb()` in `@koe/db`). Docker is not required for unit/integration tests in Vitest.
- **Docker Compose**: `compose.yaml` (Postgres 18 + one-shot migration runner + server) and `compose.dev.yaml` (watch mode).

## Workflow & Implementation

- **Tickets**: Tracer-bullet vertical slices located in `.scratch/headless-comments/issues/`.
- **Execution**: Implement tickets sequentially (01 -> 19). Each ticket must be a testable vertical slice.
- **Issue Tracker & Docs**: Local issues in `.scratch/` until GitHub remote is linked. See `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md`, and `docs/agents/domain.md`.