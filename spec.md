## Problem Statement

A site owner wants rich, pluggable commenting — emoji reactions, article reactions, GIFs, markdown, up/down votes, nested replies, moderation, admin roles, social logins, autosave — without being locked into a specific frontend or CMS. Existing comment systems bundle the UI and the backend, so they can't be re-themed, re-platformed, or driven from a custom interface. The owner needs a headless system they can self-host once and plug into any website.

## Solution

A self-hosted TypeScript service that owns the full comment lifecycle and exposes it three ways: a REST API (`/api/v1`) as the source of truth, a typed JS SDK wrapping it, and a drop-in web component for zero-config use. A basic Material admin UI handles moderation and settings. Everything is configurable via environment variables, and every entity carries a `metadata` blob plus an event bus so integrators can extend behavior without forking.

## User Stories

1. As a visitor, I want to comment anonymously without creating an account, so I can participate with zero friction.
2. As a visitor, I want to sign in with Google, so I can comment using an existing identity.
3. As a visitor, I want to sign in with GitHub, so I can comment using an existing identity.
4. As a visitor, I want to sign in with X, so I can comment using an existing identity.
5. As a guest who just signed in, I want my anonymous posts merged into my account, so I don't lose my history.
6. As a user, I want to link multiple social identities to one account, so I can sign in from any of them.
7. As an admin, I want to disable anonymous posting, so only authenticated users can comment.
8. As an admin, I want inactive anonymous users pruned automatically, so the user table doesn't balloon.
9. As an integrator, I want to map any page to a thread via an opaque external reference, so I can comment on arbitrary content.
10. As an integrator, I want threads created automatically on first access, so I don't need a separate provisioning step.
11. As a moderator, I want to close a thread, so no new comments or replies can be added.
12. As a moderator, I want to lock a thread, so it becomes fully read-only (no votes or reactions either).
13. As a moderator, I want to enable post-moderation on a specific thread, so its comments publish immediately.
14. As a visitor, I want to write a comment in markdown, so I can format text, links, and images.
15. As a visitor, I want to embed a GIF in a comment, so I can express myself.
16. As a visitor, I want to reply to a comment, so I can take part in a nested discussion.
17. As a visitor, I want to see nested replies in context, so I can follow a conversation.
18. As a visitor, I want to edit my own comment, so I can fix mistakes.
19. As a visitor, I want to delete my comment, so I can remove it (leaving a tombstone when it has replies).
20. As a comment author, I want to see my pending comment marked "awaiting approval," so I know it's in the moderation queue.
21. As a visitor, I want to sort comments by oldest, newest, or top, so I can read the way I prefer.
22. As a visitor, I want top-level comments paginated with full nested subtrees inline, so loading stays fast.
23. As a reader, I want raw HTML blocked in comments, so malicious scripts can't be injected.
24. As a reader, I want nesting capped at depth 4 with deeper replies flattened, so threads don't collapse into unreadable nesting.
25. As a visitor, I want to upvote or downvote a comment, so I can signal agreement.
26. As a voter, I want to toggle or change my vote, so I can correct it.
27. As a visitor, I want to see net vote counts, so I can gauge consensus.
28. As a visitor, I want to react to a comment with an emoji from the allowed set, so I can express myself quickly.
29. As a visitor, I want to react to an article itself, so I can react to the content, not only to comments.
30. As a visitor, I want to remove my reaction, so I can change my mind.
31. As an admin, I want to configure the emoji allowlist, so I control which reactions are available.
32. As a visitor, I want to report an abusive comment, so a moderator can review it.
33. As a moderator, I want a moderation queue of pending and reported comments, so I can review efficiently.
34. As a moderator, I want to approve, reject, or delete a comment, so I can enforce policy.
35. As a moderator, I want to mark a comment as spam, so it's removed from public view.
36. As a moderator, I want to suspend a user, so they temporarily can't post.
37. As an admin, I want to ban a user, so they permanently can't post and their existing content is hidden.
38. As an admin, I want an audit trail of moderation actions, so I can review who did what.
39. As an admin, I want to assign roles, so I can delegate moderation.
40. As a commenter, I want my in-progress comment autosaved to localStorage, so I don't lose it on refresh.
41. As a commenter, I want to upload an image to the configured provider (imgbb), so I can embed it in my comment.
42. As an integrator, I want a pluggable media provider, so I can swap imgbb for another provider.
43. As an integrator, I want to attach custom fields to threads, comments, and users, so I can store my own data.
44. As an integrator, I want to subscribe to webhooks, so my systems react to comment events.
45. As a developer, I want a pluggable markdown renderer, so I can customize rendering without forking.
46. As a developer, I want a typed SDK, so I can build any UI on top of the API.
47. As a site owner, I want a drop-in widget, so I can add comments without building a UI.
48. As an admin, I want an admin UI for the queue, comments, users, and settings, so I can manage without curl.
49. As a site owner, I want environment-based configuration, so I can deploy via Docker.
50. As a site owner, I want rate limits on posting, voting, and reacting, so I can prevent spam and abuse.
51. As a site owner, I want a duplicate-comment guard, so bots can't flood identical comments.

## Implementation Decisions

- **Single-tenant, self-hosted.** One deployment serves one site; no multi-tenant isolation tables.
- **Delivery surfaces.** REST API (`/api/v1`) as canonical interface; typed JS SDK; drop-in web component (Lit, shadow DOM, CSS-variable theming); Material (MUI) admin UI served at `/admin`.
- **Language & runtime.** TypeScript on Node.
- **Database.** PostgreSQL. Denormalized counters (`comment_count`, `upvotes`, `downvotes`, `reaction_totals`) updated transactionally with their writes, plus a `recount` maintenance job as a safety valve.
- **ORM & migrations.** Drizzle ORM with generated migrations.
- **API framework.** Fastify, with RFC 9457 `application/problem+json` error responses.
- **Validation.** Zod schemas shared between server and SDK (single source of truth).
- **Authentication.** Hybrid: public API/SDK/widget use bearer tokens (short-lived access ~15 min + rotated refresh tokens with reuse detection; anonymous guests get access tokens only). Admin UI uses a `SameSite=Lax` session cookie plus CSRF token on state-changing endpoints. OAuth (Google/GitHub/X) via `arctic`, with a popup `postMessage` flow and a redirect + token-in-fragment fallback.
- **Identity model.** A `User` has one or more `Identity` rows (providers: `anonymous`, `google`, `github`, `x`). On login, a guest `User` merges with the authenticated account. Anonymous visitors are real guest `User` rows, pruned after N inactive days.
- **Roles.** `guest`, `member`, `moderator`, `admin`, mapped to a permission matrix. User `status`: `active`, `suspended`, `banned` — suspended is temporary and content stays visible; banned is permanent and existing content is hidden.
- **Threads.** Keyed by an opaque `externalRef` (integrator-owned, stored verbatim), get-or-create on read. `status`: `open`, `closed`, `locked`. `preModeration` boolean (default true).
- **Comments.** Store both `body_md` (source) and `body_html` (rendered, sanitized). Markdown rendered server-side through a pluggable `remark` pipeline + `rehype-sanitize`; raw HTML disallowed; links and image/GIF embeds allowed. `status`: `pending`, `published`, `spam`, `deleted`. Default `pending` under pre-moderation; author sees own pending comment with a badge. Nested via `parent_id` with denormalized `depth` and materialized `path`; depth cap 4, replies beyond the cap attach to the nearest allowed ancestor. Soft delete leaves a tombstone and keeps children. Edits allowed with `edited_at`, no history.
- **Votes.** One per user per comment, `+1`/`-1`, toggleable. Anonymous allowed (rate-limited). "top" sort = net votes, tiebroken by recency.
- **Reactions.** Configurable emoji allowlist (one engine for both comment and thread targets, polymorphic by `target_type`/`target_id`).
- **Reports.** Flag a comment with a reason; `status`: `open`, `resolved`, `dismissed`.
- **Moderation.** Queue of pending/reported comments; approve/reject/delete/spam actions; every action written to a `moderation_actions` audit table.
- **Autosave.** Client-side only (localStorage), no server drafts.
- **Media.** Client-side upload to imgbb behind a pluggable provider interface (key lives in the client); returns a URL to embed in markdown. No server-side file storage in v1.
- **Extensibility.** Internal event bus emitting a fixed catalog; outbound HMAC-signed webhooks built on it later; `metadata` JSONB passthrough on threads/comments/users (filtering on metadata deferred).
- **Event catalog.** `comment.created`, `comment.updated`, `comment.deleted`, `comment.approved`, `comment.rejected`, `report.created`, `report.resolved`, `user.banned`, `user.suspended`, `thread.closed`, `thread.locked`, `vote.created`, `reaction.created`.
- **Monorepo.** npm + Turborepo, with packages as deep modules: `core` (shared types/schemas/events), `db`, `auth`, `renderer`, `media`, `server`, `moderation`, `sdk`, `widget`, plus `admin` app. (The `core` package is the single shared contract between `server` and `sdk`.)
- **Configuration.** All via environment: DB URL, OAuth credentials, token secrets/expiries, rate-limit values, depth cap, `allowAnonymous`, anonymous prune age, emoji allowlist, media provider key, CORS origins.
- **Build order.** (1) tracer bullet (repo, scaffold, migrations, thread+comment create/read, guest + Google OAuth, one end-to-end API→SDK→widget test); (2) core commenting (nested replies, markdown, votes, comment reactions, pre-moderation default + pending UX, queue, roles/permissions); (3) article reactions + media + autosave; (4) moderation hardening (reports, ban/suspend, close/lock, audit, rate limits); (5) admin UI; (6) SDK/widget polish + theming + docs; (7) extensibility (webhooks, renderer adapter, plugin hooks).

## Testing Decisions

- **Seam.** The public REST API boundary — the single seam through which the system is tested.
- **What makes a good test.** Assert external behavior only (status codes, problem+json error shapes, and observable state via subsequent reads); never assert implementation details, internal tables directly, or HTTP plumbing internals.
- **Integration tests.** Drive the API against real Postgres (`testcontainers`) covering auth flows, comment lifecycle, moderation transitions, votes/reactions, and rate-limit/abuse guards.
- **SDK contract tests.** Validate the typed SDK against the shared Zod schemas in the `core` package.
- **Unit tests.** Restricted to pure internals: markdown sanitization allowlist, permission checks, and depth/path computation.
- **Prior art.** None — this is greenfield; the API-boundary seam is the prior art convention this repo will standardize on.

## Out of Scope

- Email / magic-link login and all server-sent notifications.
- Real-time updates (WebSockets/SSE) — polling/page-load only.
- Full-text search (deferred PostgreSQL FTS bolt-on).
- Comment edit history (only `edited_at` in v1).
- Filtering/querying on `metadata` (passthrough only).
- Server-side file storage / upload (client-side imgbb only).
- GraphQL (REST only for v1).
- Multi-tenancy and self-host licensing/telemetry.
- Spam/abuse ML heuristics (manual queue + rate limits only).
- Admin UI advanced features beyond queue/comments/users/settings.

## Further Notes

- One ADR is warranted (cross-origin bearer-token auth vs. cookie/session) — it's hard to reverse, surprising without context, and the result of a real trade-off.