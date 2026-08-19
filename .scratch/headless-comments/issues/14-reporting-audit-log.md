# 14 — Moderation: Reporting & Audit Log

**What to build:** Users can report abusive comments. All moderator actions (approve/reject/delete) are permanently logged to an audit table.

**Blocked by:** 09 — Pre-Moderation & The Queue API

**Status:** ready-for-agent

- [ ] `reports` table added.
- [ ] `POST /comments/:id/reports` endpoint created.
- [ ] Queue endpoint updated to include `published` comments that have open reports.
- [ ] `moderation_actions` table added.
- [ ] `POST /moderation/actions` updated to insert an audit record for every action taken.
- [ ] Widget updated to include a "Report" button on comments.