# 15 — Moderation: Ban & Suspend Users

**What to build:** Admins can ban (permanent, hides all past comments) or suspend (temporary) users, immediately blocking them from interacting with the API.

**Blocked by:** 10 — Admin Roles & Permissions

**Status:** ready-for-agent

- [ ] `User.status` enum (`active`, `suspended`, `banned`) logic enforced in API hooks (preventing create/vote/react).
- [ ] `POST /moderation/actions` updated to support `ban` and `suspend` target types.
- [ ] `GET /comments` API updated to filter out comments authored by `banned` users (without deleting the rows).