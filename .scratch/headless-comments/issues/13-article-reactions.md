# 13 — Article Reactions

**What to build:** A separate `<koe-article-reactions>` widget allows users to react to the article/thread itself, sharing the polymorphic reactions backend.

**Blocked by:** 08 — Comment Emoji Reactions

**Status:** ready-for-agent

- [ ] `POST /threads/:id/reactions` and `DELETE /threads/:id/reactions/:emoji` endpoints.
- [ ] `reaction_totals` JSONB denormalized counter added to the `threads` table and updated transactionally.
- [ ] `<koe-article-reactions>` web component created, displaying an inline row of allowed emoji buttons and counts.