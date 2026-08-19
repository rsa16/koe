# 16 — Admin UI Foundation

**What to build:** A React + Material UI app served at `/admin` (using session cookies + CSRF protection), featuring a working Moderation Queue interface.

**Blocked by:** 09 — Pre-Moderation & The Queue API

**Status:** ready-for-agent

- [ ] `admin` package scaffolded with React, Vite, and Material UI.
- [ ] Fastify configured to serve the admin SPA statically at `/admin`.
- [ ] Session cookie auth flow and CSRF double-submit token implemented for the admin API routes.
- [ ] Moderation Queue page built, displaying pending/reported comments and action buttons (Approve, Reject, Spam).