# 10 — Admin Roles & Permissions

**What to build:** Only `moderator` and `admin` roles can access the moderation API. Admins can promote/demote users via a new `PATCH /users/:id` endpoint.

**Blocked by:** 09 — Pre-Moderation & The Queue API

**Status:** ready-for-agent

- [ ] Fastify permission hooks implemented (checking `User.role`).
- [ ] Queue and moderation action endpoints restricted to `moderator` and `admin`.
- [ ] `PATCH /users/:id` endpoint created, restricted to `admin`, allowing role changes.