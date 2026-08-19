# 06 — Nested Replies & Depth Cap

**What to build:** Users can reply to comments. The API computes depth and materialized paths, capping nesting at depth 4 (flattening deeper replies). The widget renders the threaded tree.

**Blocked by:** 04 — Tracer Bullet: Create & Read Comments

**Status:** ready-for-agent

- [ ] `POST /threads/:id/comments` accepts `parent_id`.
- [ ] Database logic calculates `depth` and materialized `path`.
- [ ] Depth cap enforcement: replies to depth 4+ are flattened to attach to the depth-3 ancestor.
- [ ] `GET /threads/:id/comments` returns the nested tree structure inline.
- [ ] Widget updated to render nested replies with appropriate visual indentation.