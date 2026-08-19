# 09 — Pre-Moderation & The Queue API

**What to build:** Comments default to `pending`. The widget shows authors their own pending comments with a badge (hidden from others). The `GET /moderation/queue` and `POST /moderation/actions` endpoints are built.

**Blocked by:** 04 — Tracer Bullet: Create & Read Comments

**Status:** ready-for-agent

- [ ] `Thread.pre_moderation` flag respected: new comments default to `pending` instead of `published`.
- [ ] `GET /threads/:id/comments` filtering updated: return `published` comments, plus any `pending` comments authored by the requesting user.
- [ ] Widget updated to display a "pending approval" badge on the user's own unpublished comments.
- [ ] `GET /moderation/queue` endpoint returns pending comments.
- [ ] `POST /moderation/actions` endpoint implemented to support `approve`, `reject`, and `delete` actions, updating comment status accordingly.