# 02 — Core Auth & Guest Users

**What to build:** Anonymous visitors can hit `POST /auth/anonymous` to get a bearer access token and a guest `User` identity, verified via `GET /auth/me`. This establishes the token lifecycle and cross-origin auth pattern for the public API.

**Blocked by:** 01 — Monorepo Scaffold & API Foundation

**Status:** ready-for-agent

- [ ] `auth` package created.
- [ ] Token signing and verification logic (JWT or opaque bearer tokens).
- [ ] `POST /auth/anonymous` endpoint creates a guest `User` and returns an access token.
- [ ] `GET /auth/me` endpoint returns the authenticated user's profile.
- [ ] Fastify authentication hook added to protect endpoints.
- [ ] Session cookie logic implemented for future use by `/admin`.