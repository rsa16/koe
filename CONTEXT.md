# Domain Glossary

- **Thread**: Commentable target, keyed by opaque `externalRef`. `status`: `open|closed|locked`; `preModeration` (default true).
- **Comment**: Markdown body + sanitized HTML. `status`: `pending|published|spam|deleted` (default `pending` under pre-moderation). Depth cap 4 (flatten beyond). Soft-delete → tombstone. `edited_at`, no history.
- **Vote**: Up/down, toggle. Anonymous allowed (rate-limited).
- **Reaction**: Emoji from a configurable allowlist; polymorphic on comment & thread.
- **Report**: Flag on a comment; `open|resolved|dismissed`.
- **Draft**: Client-side `localStorage` only (no server storage).
- **User**: Account with role `guest|member|moderator|admin`, status `active|suspended|banned`.
- **Identity**: One per login method (`anonymous|google|github|x`); many → one User, merged on login.
- **Media**: Client-side upload via pluggable provider (imgbb), key in client; returns URL to embed.
- **ModerationAction**: Audit of approve/reject/delete/spam/ban/suspend/lock.