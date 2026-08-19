# 11 — Client-side Autosave (Drafts)

**What to build:** The widget saves in-progress comments to `localStorage` (keyed by thread/parent) so users don't lose typed text on refresh.

**Blocked by:** 04 — Tracer Bullet: Create & Read Comments

**Status:** ready-for-agent

- [ ] Widget intercepts editor `input` events and debounces saves to `localStorage`.
- [ ] Storage key uniquely identifies the thread ID and parent comment ID (if replying).
- [ ] On component mount, check `localStorage` and restore drafted text.
- [ ] On successful comment submission, clear the corresponding draft from `localStorage`.