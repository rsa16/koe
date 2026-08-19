# 08 — Comment Emoji Reactions

**What to build:** Users can react to comments with emojis from a configurable allowlist. The widget displays an emoji picker and aggregate reaction counts.

**Blocked by:** 04 — Tracer Bullet: Create & Read Comments

**Status:** ready-for-agent

- [ ] Polymorphic `reactions` table added.
- [ ] `POST /comments/:id/reactions` and `DELETE /comments/:id/reactions/:emoji` endpoints.
- [ ] `reaction_totals` JSONB denormalized counter on `comments` updated transactionally.
- [ ] Configurable emoji allowlist validated by Zod schemas.
- [ ] Widget includes an emoji picker and displays grouped reaction counts with active state for the current user.