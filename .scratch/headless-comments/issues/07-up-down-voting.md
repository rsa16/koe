# 07 — Up/Down Voting

**What to build:** Users can upvote, downvote, and toggle their votes. Denormalized counters update transactionally. The widget displays vote counts and interactive buttons.

**Blocked by:** 04 — Tracer Bullet: Create & Read Comments

**Status:** ready-for-agent

- [ ] `votes` table added.
- [ ] `POST /comments/:id/vote` (accepts `value: 1 | -1`) and `DELETE /comments/:id/vote` endpoints implemented.
- [ ] `upvotes` and `downvotes` denormalized counters on `comments` updated transactionally with vote changes.
- [ ] Widget displays upvote/downvote buttons and net vote count.
- [ ] Widget reflects the current user's vote state (toggled).