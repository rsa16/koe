# koe

Self-hosted, headless commenting system. Own the full comment lifecycle behind a
REST API (`/api/v1`) and consume it from a typed JavaScript SDK or a drop-in Lit
web component — with a Material admin UI for moderation down the road.

- **Backend:** Fastify + Drizzle ORM + PostgreSQL, TypeScript on Node.
- **Contracts:** Zod schemas in `@koe/core` shared by the server and SDK.
- **Errors:** RFC 9457 Problem Details (`application/problem+json`) everywhere.
- **Auth:** Bearer access tokens for the public API; session cookies + CSRF for
  the (planned) admin UI. See
  [ADR 0001](docs/adr/0001-hybrid-cross-origin-auth.md).

> **Status.** Built as tracer-bullet tickets (`.scratch/headless-comments/issues/`).
> Tickets 01–10 plus 12 (media), 13 (article reactions), 20 (route refactor) and
> 21 (demo) are implemented. Tickets 11 and 14–19 are still open — see
> [README Maintenance](#readme-maintenance-unresolved-tickets).

## Features (available today)

- Anonymous (guest) auth with bearer access tokens, plus Google OAuth login.
- Get-or-create **Threads** keyed by an opaque `externalRef`.
- Markdown **Comments** rendered server-side and sanitized (raw HTML blocked).
- Nested replies with a depth cap of 4 (deeper replies flatten to the cap).
- Up/down **Votes** with toggle/switch and denormalized counters.
- Polymorphic emoji **Reactions** on comments, driven by a configurable allowlist.
- **Article reactions**: react to the `Thread` itself with the same polymorphic
  reaction engine and emoji allowlist.
- Pre-moderation: comments default to `pending`; authors see their own pending
  comments, everyone else doesn't.
- Moderation queue + approve/reject/delete actions, gated to `moderator`/`admin`.
- Admin-only role changes via `PATCH /api/v1/users/:id`.
- Pluggable **Media** upload: the widget posts a selected image to imgbb with a
  client-side key and embeds the returned URL as `![image](url)`.
- Drop-in `<koe-comments>` Lit web component (Tailwind styles, light/dark theme).
- Standalone `<koe-article-reactions>` Lit web component for reacting to the
  article/thread itself.

Domain vocabulary is fixed in [`CONTEXT.md`](CONTEXT.md) — use those exact terms
(`Thread`, `Comment`, `Identity`, `User`, `Vote`, `Reaction`, `Report`,
`ModerationAction`).

## Architecture

```
                     ┌─────────────────────────────────────────┐
  Any website ──────▶│  <koe-comments>  (Lit web component)     │
                     │        │                                 │
  Any UI / script ──▶│  @koe/sdk (typed fetch wrappers)         │
                     │        │                                 │
                     └────────┼─────────────────────────────────┘
                              ▼
                     REST API  /api/v1   (Fastify, @koe/server)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        @koe/renderer    @koe/auth        @koe/db
      (markdown +       (JWT sign/       (Drizzle schema +
       sanitize)         verify)          migrations)
                              │
                              ▼
                        PostgreSQL
```

### Monorepo layout

| Path | Package | Responsibility |
| --- | --- | --- |
| `packages/core` | `@koe/core` | Shared Zod schemas, types, event/domain vocabulary. Single contract between server and SDK. |
| `packages/db` | `@koe/db` | Drizzle schema, migration SQL + runner, PGlite in-memory test DB. |
| `packages/auth` | `@koe/auth` | Bearer token signing/verification, OAuth state, admin session-cookie helpers. |
| `packages/renderer` | `@koe/renderer` | Markdown → sanitized HTML via `remark` + `rehype-sanitize`. |
| `packages/server` | `@koe/server` | Fastify REST API. Routes in `src/routes/`, shared plugins in `src/plugins/`. |
| `packages/sdk` | `@koe/sdk` | Typed client wrapping the REST API; validates responses with `@koe/core`; exposes the pluggable media provider abstraction. |
| `packages/widget` | `@koe/widget` | `<koe-comments>` Lit web component. |
| `apps/demo` | `@koe/demo` | Self-contained demo: PGlite DB + server + bundled widget + SDK walkthrough. |

Build order matters: `@koe/server` consumes the built `dist/` of `core`, `db`,
`auth`, and `renderer`. Always build through Turborepo so dependencies build
first.

## Quick start

### Docker Compose (Postgres + migrations + server)

```bash
cp .env.example .env          # then edit JWT_SECRET and DATABASE_URL
docker compose up --build
```

`compose.yaml` starts Postgres, runs the one-shot `migrate` service, then starts
the server on `http://localhost:3000`. The migration service must exit 0 before
the server starts.

### Local development

```bash
npm install
cp .env.example .env          # set JWT_SECRET (required) and DATABASE_URL
docker compose -f compose.dev.yaml up db   # just Postgres; or run your own
npm run build                  # build core/db/auth/renderer/server dist outputs
npm --workspace=@koe/db run db:migrate
npm run dev                    # Turborepo watch: tsc --watch + tsx watch
```

### Interactive demo (no Docker, no database)

```bash
npm --workspace=@koe/demo run demo
# → http://localhost:3000
```

The demo spins up an in-memory PGlite database and the Fastify server, serves the
bundled `<koe-comments>` widget on a demo page, seeds an admin user and demo
thread, then runs an automated SDK walkthrough covering tickets 01–10. Append
`?imgbbKey=YOUR_IMGBB_KEY` to the demo URL to enable client-side image uploads.

## Configuration

All configuration is environment-based. The server reads environment variables
directly (`packages/server/src/index.ts`); the compose files pass a subset
through.

| Variable | Required | Purpose |
| --- | --- | --- |
| `JWT_SECRET` | **yes** | Signing secret for bearer access tokens. Must be a long random string (32+ chars). |
| `DATABASE_URL` | yes (defaults) | Postgres connection string. Default: `postgres://postgres:postgres@localhost:5432/koe`. |
| `PORT` | no | HTTP port. Default `3000`. |
| `HOST` | no | Bind address. Default `0.0.0.0`. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | compose only | Used by the bundled Postgres service. |
| `REACTION_ALLOWLIST` | no | Comma-separated emoji allowlist. Defaults to `👍,❤️,😂,🎉,😮,🙏`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | no | Enables Google OAuth when all three are set. |
| `CLIENT_ORIGIN` | no | Origin the OAuth callback may `postMessage` back to. Defaults to `*`. |

## API reference

Base path `/api/v1`. All errors are RFC 9457 Problem Details. Authenticated
endpoints expect `Authorization: Bearer <accessToken>`.

### Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | — | Liveness. Returns `{ "status": "ok" }`. |

### Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/anonymous` | — | Creates a guest `User` + `Identity`, returns `{ accessToken, user }`. |
| `GET` | `/api/v1/auth/me` | bearer | Returns the current `User`. |
| `GET` | `/api/v1/auth/oauth/google` | — | Redirects to Google. Optional `?guestUserId=` merges the guest on callback. `503` if OAuth is not configured. |
| `GET` | `/api/v1/auth/oauth/google/callback` | — | Exchanges the code, resolves/merges the `User`, and renders an HTML page that `postMessage`s the token to `CLIENT_ORIGIN`. |

### Threads

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/threads/by-ref/:ref` | optional bearer | Get-or-create a `Thread` by `externalRef`. Optional query `title`, `url` set on creation. Always `200`. Returns `reactionTotals`; with a bearer token also includes the caller's `userReactions`. |

### Thread reactions

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/threads/:id/reactions` | bearer | Body `{ emoji }` from the configured allowlist. Reacts to the article/thread: creates (`201`) or toggles off (`204`). |
| `DELETE` | `/api/v1/threads/:id/reactions/:emoji` | bearer | Idempotent removal. `204`. |

### Comments

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/threads/:id/comments` | bearer | Create a `Comment`. Body `{ bodyMd, parentId? }`. `201`. Status is `pending` unless the thread has post-moderation. |
| `GET` | `/api/v1/threads/:id/comments` | optional bearer | Paginated top-level comments with full nested subtrees inline. Query `page` (default 1), `pageSize` (default 20, max 100). Returns `{ comments, total, page, pageSize }`. With a bearer token, includes the caller's own `pending` comments plus their `userVote`/`userReactions` state. |

### Votes

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/comments/:id/vote` | bearer | Body `{ value: 1 \| -1 }`. Creates (`201`), switches (`200`), or toggles off (`204`) the caller's vote. |
| `DELETE` | `/api/v1/comments/:id/vote` | bearer | Idempotent removal. `204`. |

### Comment reactions

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/comments/:id/reactions` | bearer | Body `{ emoji }` from the configured allowlist. Creates (`201`) or toggles off (`204`). |
| `DELETE` | `/api/v1/comments/:id/reactions/:emoji` | bearer | Idempotent removal. `204`. |

### Moderation

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/moderation/queue` | `moderator`/`admin` | Pending comments with thread context and author name. |
| `POST` | `/api/v1/moderation/actions` | `moderator`/`admin` | Body `{ commentId, action: "approve" \| "reject" \| "delete" }`. Approve → `published`, reject → `deleted`. `409` if approving/rejecting a non-pending comment. |

### Users

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `PATCH` | `/api/v1/users/:id` | `admin` | Body `{ role }`. Changes a user's role. |

## SDK

`@koe/sdk` wraps the API and validates every response against `@koe/core`
schemas. Errors are thrown as `KoeApiError` with `status`, `title`, `type`,
`detail`, and `instance`.

```ts
import { createKoeClient } from "@koe/sdk";

const client = createKoeClient({ baseUrl: "http://localhost:3000" });

const { accessToken } = await client.auth.anonymous();
const thread = await client.threads.getByRef("my-article", { title: "My Article" });

await client.threads.react(thread.id, "🎉", accessToken);
await client.comments.create(thread.id, { bodyMd: "Hello **world**" }, accessToken);
const list = await client.comments.list(thread.id, undefined, accessToken);
await client.comments.vote(list.comments[0].id, 1, accessToken);
await client.comments.react(list.comments[0].id, "🎉", accessToken);
await client.threads.unreact(thread.id, "🎉", accessToken);

// Moderator/admin only:
const queue = await client.moderation.queue(adminToken);
await client.moderation.act(queue.comments[0].id, "approve", adminToken);
```

### Media

The SDK ships a pluggable media provider abstraction for client-side uploads:

```ts
import { createImgbbMediaProvider, MediaProvider } from "@koe/sdk";

const provider = createImgbbMediaProvider({ apiKey: "imgbb-client-key" });
const { url } = await provider.upload(file); // → { url: "https://i.ibb.co/..." }
```

`MediaProvider` is any object with `upload(file: Blob) => Promise<{ url: string }>`.
The built-in `createImgbbMediaProvider` posts the file to `api.imgbb.com` with the
client-side key and throws `MediaUploadError` on failure. Implement `MediaProvider`
yourself to target another host; no server-side storage is involved.

## Web component

```html
<script type="module" src="/widget.js"></script>

<koe-comments
  base-url="http://localhost:3000"
  thread-ref="my-article"
  reaction-emojis="👍,❤️,🎉"
  gif-api-key="<optional Giphy key>"
></koe-comments>
```

| Attribute | Description |
| --- | --- |
| `base-url` | API base URL. Empty means same-origin. |
| `thread-ref` | Opaque `externalRef` of the thread to load. |
| `reaction-emojis` | Comma-separated allowlist override for the picker. |
| `gif-api-key` | Optional Giphy key; without it the GIF picker only accepts pasted image URLs. |
| `media-api-key` | Optional imgbb API key; when set, the composer shows an image upload button. |

The widget handles guest auth automatically (token cached in `localStorage` under
`koe_access_token`, refreshed on `401`), persists theme under `koe_theme`, and
emits/listens for `koe-theme-change` to sync light/dark with the host page.

Image upload is client-side: selecting a file — or pasting an image from the
clipboard — posts it directly to imgbb with the `media-api-key` and inserts
`![image](url)` into the draft. For a custom provider, create the element and
call `setMediaProvider(provider)` with any object satisfying the `MediaProvider`
interface (`upload(file) => { url }`).

### Article reactions

`<koe-article-reactions>` is a standalone element that renders an inline row of
allowed emoji buttons with counts for the article/thread itself. It shares the
same guest session (`koe_access_token`) and theme (`koe_theme`) as
`<koe-comments>`, so the two can sit on the same page.

```html
<koe-article-reactions
  base-url="http://localhost:3000"
  thread-ref="my-article"
  reaction-emojis="👍,❤️,🎉"
></koe-article-reactions>
```

| Attribute | Description |
| --- | --- |
| `base-url` | API base URL. Empty means same-origin. |
| `thread-ref` | Opaque `externalRef` of the thread to react to. |
| `reaction-emojis` | Comma-separated allowlist override for the buttons. |

Clicking a button toggles the caller's reaction and re-renders the count; the
button is highlighted while the caller's reaction is active.

## Development

```bash
npm run build       # build all workspaces in dependency order (turbo)
npm run typecheck   # typecheck all workspaces (builds deps first)
npm run test        # Vitest across all packages
npm run dev         # Turborepo watch mode

# Single package or test file
npm --workspace=@koe/server test
npx vitest run packages/server/test/threads.test.ts
```

`npm run lint` is **not** configured — use typecheck + tests.

### Database migrations

```bash
npm --workspace=@koe/db run db:generate   # generate SQL from schema changes
npm --workspace=@koe/db run db:migrate    # apply migrations to $DATABASE_URL
```

## Testing

- The seam is the **public REST API boundary**. Tests assert external behavior
  (status codes, Problem Details shape, observable state via follow-up reads) —
  never internal tables or HTTP plumbing.
- Integration tests run against `@electric-sql/pglite` in memory via
  `createMemDb()` in `@koe/db`; Docker is not required.
- Unit tests are limited to pure internals (markdown sanitization, depth/path
  computation, auth token and OAuth-state logic).
- `apps/demo` includes an end-to-end SDK walkthrough (`src/walkthrough.ts`) and
  Vitest coverage for the demo server and widget.

## Documentation

- [`spec.md`](spec.md) — features, decisions, out-of-scope, testing seams.
- [`CONTEXT.md`](CONTEXT.md) — canonical domain glossary.
- [`AGENTS.md`](AGENTS.md) — contributor/agent working agreement.
- [`docs/adr/`](docs/adr/) — architecture decision records.
- [`.scratch/headless-comments/issues/`](.scratch/headless-comments/issues/) —
  tracer-bullet tickets.

## README Maintenance (unresolved tickets)

This README documents only what is implemented. When one of the open tickets
lands, update it as follows.

### 11 — Client-side Autosave (Drafts)

- **Features:** add a bullet for client-side draft autosave.
- **Web component:** document that in-progress drafts are persisted to
  `localStorage`, keyed by thread and parent comment, and cleared on successful
  submit. Note any new storage keys alongside `koe_access_token`/`koe_theme`.

### 14 — Moderation: Reporting & Audit Log

- **API reference:** add `POST /api/v1/comments/:id/reports`; update the queue
  description to include published comments with open reports.
- **API reference:** note that `POST /api/v1/moderation/actions` now writes an
  audit record.
- **Architecture/data model:** mention the `reports` and `moderation_actions`
  tables (and `Report` / `ModerationAction` statuses).
- **Web component:** document the per-comment "Report" button.
- **Features:** add bullets for reporting and the moderation audit trail.

### 15 — Moderation: Ban & Suspend Users

- **API reference:** note that `PATCH /api/v1/users/:id` now accepts `status`
  changes (`suspend`/`ban`), and that suspended/banned users are blocked from
  create/vote/react.
- **API reference:** note that banned users' comments are filtered from comment
  listings (rows retained).
- **Moderation:** document `ban`/`suspend` targets on the actions endpoint.
- **Features:** add bullets for suspend/ban behavior and content hiding.

### 16 — Admin UI Foundation

- **Quick start:** add how to build/run the admin UI and where it is served
  (`/admin`).
- **Monorepo layout:** add the `apps/admin` (React + MUI + Vite) row.
- **Auth/Architecture:** document the admin session-cookie + CSRF
  double-submit flow alongside the bearer-token API auth (link ADR 0001).
- **Features:** add a bullet for the admin moderation queue UI.
- **Configuration:** add any admin-specific env vars (session secret, CSRF, etc.).

### 17 — Admin UI: Users & Settings

- **Admin UI section:** document the Users page (paginated table, role +
  status controls) and the Settings page.
- **Configuration:** document which settings are dynamic vs. env-only, and how
  metadata config is edited.

### 18 — Rate Limiting & Duplicate Guard

- **Configuration:** add the new rate-limit env vars for comments, votes, and
  reactions, plus the duplicate-window value.
- **API reference:** document `429` responses and the duplicate-comment `409`
  (or whichever status is chosen) for identical bodies within the window.
- **Features:** add bullets for rate limiting and the duplicate-comment guard.

### 19 — Extensibility: Event Bus & Webhooks

- **New "Extensibility" section:** list the event catalog (`comment.created`,
  `comment.updated`, `comment.deleted`, `comment.approved`, `comment.rejected`,
  `report.created`, `report.resolved`, `user.banned`, `user.suspended`,
  `thread.closed`, `thread.locked`, `vote.created`, `reaction.created`), the
  webhook subscription configuration, and how receivers verify the HMAC-SHA256
  signature.
- **Configuration:** add webhook subscription/secret env vars.
- **Monorepo layout:** add the `@koe/moderation` package (or wherever the bus
  and webhook dispatcher live) if created.
- **Features:** add a bullet for signed outbound webhooks.

### Also worth noting when editing

- Tickets 01, 02, and 03 carry the `ready-for-agent` label but are implemented
  and marked complete in their checklists; this README treats them as done. If
  their statuses are corrected upstream, no README change is needed.
- When a `report`/`events` README change introduces a new **domain term**,
  update [`CONTEXT.md`](CONTEXT.md) first and use it verbatim.
