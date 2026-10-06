# 4. Make the API prefix configurable so it can be mounted under a host path

Date: 2026-10-05

## Status

Accepted

## Context

`@koe/sdk` hardcodes `/api/v1/...` request paths and treats `baseUrl` as an origin only. otl-site wants the public endpoint mounted at `/api/comments/v1` so it groups with the site's other proxied services, while Koe's internal routes remain `/api/v1`.

## Decision

Add an `apiPrefix` option to `createKoeClient` and an `api-base` attribute to the widgets. otl-site sets the prefix to `/api/comments/v1`; nginx rewrites `/api/comments/v1/*` to Koe's internal `/api/v1/*`. Koe's server routes are unchanged.

Considered options: exposing Koe at `/api/v1` (rejected — collides with other `/api/*` services behind the same proxy) and renaming the server routes (rejected — wide blast radius across server, SDK, and tests).

## Consequences

*   **Positive:** a host can namespace the public mount without touching Koe's internals.
*   **Negative:** one more option in the SDK's public surface.
