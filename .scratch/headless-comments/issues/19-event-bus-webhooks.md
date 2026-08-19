# 19 — Extensibility: Event Bus & Webhooks

**What to build:** The system emits domain events (`comment.created`, `report.resolved`, etc.) to an internal bus, which dispatches HMAC-signed HTTP webhooks to configured URLs.

**Blocked by:** 09 — Pre-Moderation & The Queue API

**Status:** ready-for-agent

- [ ] In-process event emitter (`mitt` or similar) wired into domain services.
- [ ] `webhook_subscriptions` configuration read.
- [ ] Worker/listener dispatches POST requests with HMAC SHA-256 signatures for configured events.