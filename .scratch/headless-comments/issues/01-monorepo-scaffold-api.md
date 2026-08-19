# 01 — Monorepo Scaffold & API Foundation

**What to build:** A running npm Turborepo containing the `core` (Zod schemas), `db` (Drizzle Postgres schemas), and `server` (Fastify) packages, with a working `GET /threads/by-ref/:ref` endpoint. This sets up the foundational database schema and the HTTP server so subsequent vertical slices have a place to land.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [x] npm workspace and Turborepo configured.
- [x] `core` package created with shared types and Zod schemas.
- [x] `db` package created with Drizzle ORM, Postgres schemas for core entities (users, identities, sessions, threads, comments), and a migration script.
- [x] `server` package created (Fastify) connected to the database.
- [x] `GET /threads/by-ref/:ref` endpoint implemented (get-or-create thread logic).
- [x] Healthcheck endpoint implemented.
- [x] Database integration tests run via Vitest and `testcontainers`.