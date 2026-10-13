# Domain Glossary

- **Thread**: Commentable target, keyed by opaque `externalRef`. `status`: `open|closed|locked`; `preModeration` (default true).
- **Comment**: Markdown body + sanitized HTML. `status`: `pending|published|spam|deleted` (default `pending` under pre-moderation). Depth cap 4 (flatten beyond). Soft-delete → tombstone. `edited_at`, no history.
- **Vote**: Up/down, toggle. Anonymous allowed (rate-limited).
- **Reaction**: Emoji from a configurable allowlist; polymorphic on comment & thread.
- **Report**: Flag on a comment; `open|resolved|dismissed`.
- **Draft**: Client-side `localStorage` only (no server storage).
- **User**: Account with role `guest|member|moderator|admin`, status `active|suspended|banned`.
- **Network Block**: A time-boxed refusal of write interactions from a client IP address. Auto-derived from a User ban; independent of, and outlives, that User's status.
- **Identity**: One per login method (`anonymous|google|discord|github|x`); many → one User, merged on login.
- **Media**: Client-side upload via pluggable provider (imgbb), key in client; returns URL to embed.
- **ModerationAction**: Audit of approve/reject/delete/spam/ban/suspend/block/lock.
- **Domain Event**: Envelope `{ id, type, occurredAt, data }` emitted on the in-process event bus from a fixed catalog (`comment.created`, `report.created`, `vote.created`, ...).
- **Webhook**: Outbound `POST` of a Domain Event to a subscribed URL, signed `sha256=<hex>` with the subscription's HMAC secret; fire-and-forget, never blocks the API.