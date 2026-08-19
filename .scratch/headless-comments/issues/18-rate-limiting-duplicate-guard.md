# 18 — Rate Limiting & Duplicate Guard

**What to build:** The Fastify server blocks spam by enforcing env-configurable rate limits per IP/User and rejecting identical comment bodies sent within a 30-second window.

**Blocked by:** 04 — Tracer Bullet: Create & Read Comments

**Status:** ready-for-agent

- [ ] `@fastify/rate-limit` configured via environment variables (comments, votes, reactions limits).
- [ ] Database query/guard added to `POST /threads/:id/comments` rejecting exact `body_md` matches from the same `author_id` within the last 30 seconds.