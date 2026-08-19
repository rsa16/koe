# 04 — Tracer Bullet: Create & Read Comments

**What to build:** End-to-end commenting. Users can post raw markdown comments and fetch a flat list of them. The `sdk` and `widget` (Lit web component) are scaffolded and working end-to-end with the API.

**Blocked by:** 02 — Core Auth & Guest Users

**Status:** ready-for-agent

- [ ] `POST /threads/:id/comments` endpoint saves raw `body_md` (no html rendering yet).
- [ ] `GET /threads/:id/comments` endpoint returns a flat, paginated list of comments.
- [ ] `sdk` package created with typed fetch wrappers for auth, threads, and comments.
- [ ] `widget` package created (Lit web component).
- [ ] `<koe-comments>` component handles anonymous auth, renders a comment list, and a simple submit form.
- [ ] End-to-end integration test confirms a comment can be posted and read back.