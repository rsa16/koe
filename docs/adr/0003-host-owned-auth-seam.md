# 3. Accept an externally-owned token instead of always self-authenticating

Date: 2026-10-05

## Status

Accepted

## Context

The widget manages its own guest session today: it reads and writes the `koe_access_token` localStorage key, calls `auth.anonymous()`, evolves that identity on login, and on a `401` deletes the token and issues a *new* anonymous guest. Embedding hosts (otl-site) own a single Koe identity that is shared across features — comments and the Library — and cannot tolerate the comments UI silently dropping a logged-in member back to a guest when a short-lived token expires. Koe currently has no refresh flow.

## Decision

The widgets gain a reactive `token` property. When a non-empty token is supplied:

- the widget never self-issues and never silently re-anonymises;
- on a `401` it emits an outbound `koe-auth-expired` event and waits for the host to supply a fresh token.

The host owns the token lifecycle, including refresh. When no token is supplied (standalone use), the widget keeps today's guest fallback behaviour.

## Consequences

*   **Positive:** a host can make one identity the single source of truth across every embedded widget.
*   **Open:** Koe has no refresh flow yet; hosts must own refresh, or Koe must add one. Either way, silent guest downgrade on expiry is prohibited.
