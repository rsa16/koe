# koe

Self-hosted, headless commenting system. Own the full comment lifecycle behind a
REST API (`/api/v1`) and consume it from a typed JavaScript SDK or a drop-in Lit
web component — with a Material admin UI at `/admin` for moderation.

- **Backend:** Fastify + Drizzle ORM + PostgreSQL, TypeScript on Node.
- **Contracts:** Zod schemas in `@koe/core` shared by the server and SDK.
- **Errors:** RFC 9457 Problem Details (`application/problem+json`) everywhere.
- **Auth:** Bearer access tokens for the public API; session cookies + CSRF for
  the (planned) admin UI. See
  [ADR 0001](docs/adr/0001-hybrid-cross-origin-auth.md).

> **Status.** Built as tracer-bullet tickets (`.scratch/headless-comments/issues/`).
> Tickets 01–10 plus 12 (media), 13 (article reactions), 14 (reporting & audit),
> 15 (ban & suspend), 16 (admin UI foundation), 17 (admin users & settings),
> 20 (route refactor) and 21 (demo)
> are implemented. Tickets 11, 18 and 19 are still open — see
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
- **Reports**: visitors flag a `Comment` with a reason; open reports surface
  published comments in the moderation queue until they are resolved.
- Moderation **audit log**: every approve/reject/delete/ban/suspend writes an
  immutable `ModerationAction` record, readable by admins.
- **User bans & suspensions**: `moderator`/`admin` can suspend a user; only
  `admin` can ban. Suspended and banned accounts are blocked from creating
  comments, voting, and reacting (reads still work).
- **Banned-user content hiding**: comments authored by `banned` users are
  filtered out of comment listings while their rows are retained.
- **Rate limiting & duplicate guard**: comment, vote, and reaction writes are
  capped per `User` (guests fall back to their IP) by `@fastify/rate-limit`;
  identical `body_md` from the same author inside the duplicate window is
  rejected with `409`.
- Admin-only role changes via `PATCH /api/v1/users/:id`.
- **Admin UI** (`/admin`): a React + Material UI single-page app served by the
  API with a working Moderation Queue (pending and reported comments with
  Approve / Reject / Spam actions). It signs in by exchanging a moderator/admin
  bearer token for a `SameSite=Lax` session cookie, and state-changing calls are
  protected by a CSRF double-submit token. Admins additionally get a paginated
  **Users** page (search/filter, role changes, suspend/ban/reactivate) and a
  read-only **Settings** page surfacing the effective configuration.
- Pluggable **Media** upload: the widget posts a selected image to imgbb with a
  client-side key and embeds the returned URL as `![image](url)`.
- Drop-in `<koe-comments>` Lit web component, themeable from outside through a
  documented `--koe-*` token/`::part`/`<slot>` contract.
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
| `packages/db` | `@koe/db` | Drizzle schema (`users`, `identities`, `threads`, `comments`, `votes`, `reactions`, `reports`, `moderation_actions`), migration SQL + runner, PGlite in-memory test DB. |
| `packages/auth` | `@koe/auth` | Bearer token signing/verification, OAuth state, admin session-cookie helpers. |
| `packages/renderer` | `@koe/renderer` | Markdown → sanitized HTML via `remark` + `rehype-sanitize`. |
| `packages/server` | `@koe/server` | Fastify REST API. Routes in `src/routes/`, shared plugins in `src/plugins/`. |
| `packages/sdk` | `@koe/sdk` | Typed client wrapping the REST API; validates responses with `@koe/core`; exposes the pluggable media provider abstraction. |
| `packages/widget` | `@koe/widget` | `<koe-comments>` and `<koe-article-reactions>` Lit web components. |
| `apps/admin` | `@koe/admin` | React + Vite + Material UI admin SPA, served by `@koe/server` at `/admin`. |
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

### Admin UI

The admin SPA is built by `@koe/admin` and served by `@koe/server` from the
`apps/admin/dist` directory at `/admin`.

```bash
npm --workspace=@koe/admin run build   # → apps/admin/dist
npm run build                          # or build every workspace (turbo)
# then start the server (docker compose or `npm --workspace=@koe/server start`)
# → http://localhost:3000/admin
```

For front-end development with hot reload against a running API on port 3000:

```bash
npm --workspace=@koe/admin run dev      # Vite dev server on :5174, proxies /api
```

Open `/admin` and sign in with a moderator or admin bearer access token (the demo
prints a seeded admin token on startup). The server exchanges the token for a
`SameSite=Lax`, `HttpOnly` session cookie plus a readable `koe_csrf` cookie; the
SPA echoes that cookie back in the `x-csrf-token` header on every state-changing
request. See [ADR 0001](docs/adr/0001-hybrid-cross-origin-auth.md) for why the
public API uses bearer tokens while the admin UI uses cookies.

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
| `SESSION_SECRET` | no | Signing secret for admin session cookies. Defaults to `JWT_SECRET`. |
| `ADMIN_DIST_PATH` | no | Filesystem path to the built admin SPA. Defaults to `apps/admin/dist`. If `index.html` is absent, `/admin` is not served. |
| `RATE_LIMIT_WINDOW_MS` | no | Window for the comment/vote/reaction rate limits, in milliseconds. Default `60000`. |
| `RATE_LIMIT_COMMENTS` | no | Max comment requests per window per `User`/IP. Default `10`. |
| `RATE_LIMIT_VOTES` | no | Max vote requests per window per `User`/IP. Default `60`. |
| `RATE_LIMIT_REACTIONS` | no | Max reaction requests per window per `User`/IP. Default `60`. |
| `DUPLICATE_COMMENT_WINDOW_MS` | no | Reject an identical `body_md` from the same author within this window, in milliseconds. Default `30000`; `0` disables the guard. |

All configuration is environment-only and read-only at runtime: the admin UI
Settings page displays the effective values (`commentDepthCap`,
`reactionAllowlist`, pre-moderation default, whether Google OAuth is configured)
but cannot edit them. Change the environment and restart to reconfigure.

## API reference

Base path `/api/v1`. All errors are RFC 9457 Problem Details. Authenticated
endpoints expect `Authorization: Bearer <accessToken>`. Comment, vote, and
reaction writes that exceed their rate limit return `429 Too Many Requests`
(see [Configuration](#configuration)).

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
| `POST` | `/api/v1/threads/:id/comments` | bearer | Create a `Comment`. Body `{ bodyMd, parentId? }`. `201`. Status is `pending` unless the thread has post-moderation. Identical `bodyMd` from the same author within `DUPLICATE_COMMENT_WINDOW_MS` is rejected with `409`; exceeding `RATE_LIMIT_COMMENTS` returns `429`. |
| `GET` | `/api/v1/threads/:id/comments` | optional bearer | Paginated top-level comments with full nested subtrees inline. Query `page` (default 1), `pageSize` (default 20, max 100). Returns `{ comments, total, page, pageSize }`. With a bearer token, includes the caller's own `pending` comments plus their `userVote`/`userReactions` state. Comments authored by `banned` users are omitted (rows are retained, not deleted). |

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

### Reports

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/comments/:id/reports` | bearer | Flag a `Comment`. Body `{ reason }` (1–1000 chars). Creates an `open` `Report` (`201`). |

### Moderation

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/moderation/queue` | `moderator`/`admin` | Pending comments, plus published comments that carry an open `Report`, with thread context and author name. |
| `GET` | `/api/v1/moderation/actions` | `admin` | `ModerationAction` audit log, newest first, with actor name. |
| `POST` | `/api/v1/moderation/actions` | `moderator`/`admin` | **Comment actions.** Body `{ commentId, action: "approve" \| "reject" \| "delete" \| "spam" }`. Approve → `published` (dismisses open reports); reject/delete → `deleted`; spam → `spam` (both resolve open reports). Writes an audit record. `409` if approving/rejecting a comment that is neither pending nor carrying an open report; delete and spam always apply. |
| `POST` | `/api/v1/moderation/actions` | `moderator`/`admin` (`admin` only to ban) | **User actions.** Body `{ userId, action: "suspend" \| "ban" }`. Suspend → `suspended`; ban → `banned` and is restricted to `admin` (`403` for a `moderator`). Returns the updated `User` and writes an audit record with `targetType: "user"`. |

Suspended and banned accounts are blocked from interacting: creating comments,
voting, and reacting all return `403 application/problem+json`. Reading threads
and comments stays available. Suspended users' existing comments remain visible;
banned users' comments are hidden from listings as noted above.

### Users

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `PATCH` | `/api/v1/users/:id` | `admin` | Body `{ role }`. Changes a user's role. |

The admin UI manages users through the session-cookie endpoints below rather
than this bearer endpoint. `PATCH /api/v1/admin/users/:id` accepts a `role`
and/or `status` and writes a `ban`/`suspend` audit record on status changes.

### Admin UI API

Routes used by the `/admin` single-page app. They authenticate with the
`koe_admin_session` cookie (not bearer) and require a `moderator` or `admin`
role. State-changing requests must send the `koe_csrf` cookie value back in the
`x-csrf-token` header (CSRF double-submit); a missing or mismatched token is
`403 application/problem+json`.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/admin/session` | bearer (`moderator`/`admin`) | Exchanges an access token for an `HttpOnly` `koe_admin_session` cookie plus a readable `koe_csrf` cookie. Returns `{ user, csrfToken }`. `403` for `guest`/`member`. |
| `GET` | `/api/v1/admin/session` | session cookie | Returns `{ user }` for the current session. |
| `DELETE` | `/api/v1/admin/session` | session cookie + CSRF | Clears the session and CSRF cookies. `204`. |
| `GET` | `/api/v1/admin/moderation/queue` | session cookie | Same payload as `GET /api/v1/moderation/queue`. |
| `POST` | `/api/v1/admin/moderation/actions` | session cookie + CSRF | Same body/semantics as `POST /api/v1/moderation/actions`. |
| `GET` | `/api/v1/admin/users` | session cookie (`admin`) | Paginated users. Query `page` (default 1), `pageSize` (default 20, max 100), `role`, `status`, `search` (name/email substring). Returns `{ users, total, page, pageSize }`. |
| `PATCH` | `/api/v1/admin/users/:id` | session cookie (`admin`) + CSRF | Body `{ role?, status? }` (at least one required). Changes a user's role and/or status. Status `banned`/`suspended` writes a `ban`/`suspend` audit record; `active` reactivates. Returns the updated `User`. |
| `GET` | `/api/v1/admin/settings` | session cookie (`admin`) | Read-only effective configuration the SPA renders on the Settings page. |

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
await client.comments.report(list.comments[0].id, "spam", accessToken);
await client.threads.unreact(thread.id, "🎉", accessToken);

// Moderator/admin only:
const queue = await client.moderation.queue(adminToken);
await client.moderation.act(queue.comments[0].id, "approve", adminToken);

// Moderator/admin:
await client.moderation.suspend(someUserId, moderatorToken);

// Admin only:
const audit = await client.moderation.actions(adminToken);
await client.moderation.ban(someUserId, adminToken);
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
| `token` | Optional bearer access token owned by the host. When set, the widget uses it for every request and never self-issues a guest session. |
| `theme` | Reactive `light` \| `dark` property/attribute (default `light`). Reflects the host's design system. |
| `show-theme-toggle` | Boolean. Shows the built-in theme toggle (hidden by default so the host owns the theme). |

The widget handles guest auth automatically (token cached in `localStorage` under
`koe_access_token`, refreshed on `401`). The host owns the theme: set the
reactive `theme` property/attribute, and the built-in toggle stays hidden unless
you opt in with `show-theme-toggle`.

Image upload is client-side: selecting a file — or pasting an image from the
clipboard — posts it directly to imgbb with the `media-api-key` and inserts
`![image](url)` into the draft. For a custom provider, create the element and
call `setMediaProvider(provider)` with any object satisfying the `MediaProvider`
interface (`upload(file) => { url }`).

Every comment also has a **Report** button. It opens an inline reason box and
files a `Report` through `POST /api/v1/comments/:id/reports`; once submitted the
button reads "Reported" and disables.

### Article reactions

`<koe-article-reactions>` is a standalone element that renders an inline row of
allowed emoji buttons with counts for the article/thread itself. It shares the
same guest session (`koe_access_token`) and the same `theme`/`--koe-*` contract
as `<koe-comments>`, so the two can sit on the same page.

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
| `token` | Optional bearer access token owned by the host. When set, the widget never self-issues a guest session. |
| `theme` | Reactive `light` \| `dark` property/attribute (default `light`). |

Clicking a button toggles the caller's reaction and re-renders the count; the
button is highlighted while the caller's reaction is active.

### Host-owned identity

Both widgets accept a reactive `token` property for hosts that own a single Koe
identity across features (see [`docs/adr/0003`](docs/adr/0003-host-owned-auth-seam.md)).
When a non-empty token is supplied the widget:

- uses that token for every request and never reads or writes `koe_access_token`
  in `localStorage`, and never calls `auth.anonymous()`;
- validates it via `GET /api/v1/auth/me` before loading, so an expired or
  invalid token is detected up front;
- does **not** silently re-anonymise on expiry — instead it dispatches a
  `koe-auth-expired` `CustomEvent` (with `detail.threadRef`) and waits for the
  host to supply a fresh token.

```js
const comments = document.querySelector("koe-comments");
comments.token = session.accessToken;
comments.addEventListener("koe-auth-expired", async () => {
  comments.token = await refreshSession();
});
```

Updating `token` (on login, logout, or refresh) makes the widget refetch. With
no token set, the standalone guest-session fallback above is unchanged.

### Theming

Both widgets style themselves through a documented contract, so a host can fully
reskin them from its own design system without patching the widget source
(see [`docs/adr/0002`](docs/adr/0002-themeable-widget-contract.md)). Set the
semantic custom properties on the element, target `::part(...)` hooks for
structural overrides, and project content into the named `<slot>`s.

```css
koe-comments,
koe-article-reactions {
  --koe-surface: #ffffff;
  --koe-text: #111827;
  --koe-accent: #7c3aed;
  --koe-border: #e5e7eb;
  --koe-radius-lg: 0.25rem;
  --koe-font: "Inter", system-ui, sans-serif;
}

koe-comments::part(comment) {
  padding-block: 1rem;
  border-bottom: 1px solid var(--koe-border);
}
```

#### `--koe-*` tokens

| Group | Tokens |
| --- | --- |
| Surface | `--koe-surface`, `--koe-surface-muted`, `--koe-surface-sunken`, `--koe-surface-strong`, `--koe-skeleton` |
| Text | `--koe-text`, `--koe-text-muted`, `--koe-text-subtle`, `--koe-text-inverse` |
| Accent | `--koe-accent`, `--koe-accent-soft`, `--koe-accent-contrast` |
| Border | `--koe-border`, `--koe-border-strong`, `--koe-focus-ring` |
| Danger | `--koe-danger`, `--koe-danger-soft`, `--koe-danger-border`, `--koe-danger-contrast` |
| Warning | `--koe-warning`, `--koe-warning-soft` |
| Brand | `--koe-gif-from`, `--koe-gif-to` |
| Thread lines | `--koe-thread-line-0` … `--koe-thread-line-3` |
| Typography | `--koe-font`, `--koe-font-mono` |
| Radius | `--koe-radius-sm`, `--koe-radius-md`, `--koe-radius-lg`, `--koe-radius-xl`, `--koe-radius-2xl`, `--koe-radius-full` (names match the `rounded-*` scale they drive) |
| Spacing | `--koe-space` (base unit; every Tailwind spacing utility is a multiple) |

#### `::part` hooks

`<koe-comments>`: `root`, `header`, `title`, `count`, `error`, `composer`,
`composer-shell`, `toolbar`, `toolbar-button`, `toolbar-gif`, `toolbar-upload`,
`textarea`, `composer-actions`, `cancel`, `submit`, `gif-picker`, `gif-search`,
`gif-grid`, `gif-url`, `gif-insert`, `gif-close`, `loading`, `empty`,
`empty-title`, `empty-text`, `list`, `comment`, `avatar`, `author`, `time`,
`pending-badge`, `body`, `actions`, `vote-controls`, `vote-up`, `vote-down`,
`vote-score`, `reactions`, `reaction`, `reaction-count`, `reactions-toggle`,
`add-reaction`, `reaction-picker`, `reaction-picker-button`, `report-button`,
`report-picker`, `report-input`, `report-cancel`, `report-submit`,
`reply-composer`, `reply-button`, `thread-toggle`, `nested-list`, `theme-toggle`.

`<koe-article-reactions>`: `root`, `error`, `loading`, `group`, `reaction`,
`reaction-count`.

#### `<slot>`s

- `<koe-comments>`: `header`, `empty`, `footer`.
- `<koe-article-reactions>`: `label`, `footer`.

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
  submit. Note any new storage keys alongside `koe_access_token`.

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
- When a `report`/`events` README change introduces a new **domain term**,
  update [`CONTEXT.md`](CONTEXT.md) first and use it verbatim.
