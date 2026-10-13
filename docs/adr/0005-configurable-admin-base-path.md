# 5. Make the admin UI's mount path and API prefix configurable

Date: 2026-10-13

## Status

Accepted

## Context

`apps/admin` hardcoded three things: the Vite `base` `/admin/` (asset URLs), the React Router basename `/admin` (client routes), and the API prefix `/api/v1`. That works when Koe serves the SPA itself at `/admin`, but a host that already owns `/admin` for its own CMS cannot mount it there. otl-site serves the Koe moderation UI at `/comments/admin/` (Decap CMS owns `/admin/`) and namespaces the API at `/api/comments/v1` (ADR 0004).

## Decision

Make the mount path and API prefix build-time configuration:

*   `ADMIN_BASE` (default `/admin/`) drives the Vite `base`, the router basename (from `import.meta.env.BASE_URL`), and the server mount path (`registerAdminSpa`).
*   `VITE_ADMIN_API_PREFIX` (default `/api/v1`) drives the SPA's request prefix, mirroring the SDK's `apiPrefix` (ADR 0004).

Both are passed as Docker build args and baked in. The server reads `ADMIN_BASE` at runtime so the static mount and the SPA agree. Koe's own route paths are unchanged; a host that uses a different API prefix rewrites it at its proxy, as it does for the SDK today.

## Consequences

*   **Positive:** Koe's admin UI can be mounted under any path without forking, and its API prefix can be namespaced like the widgets and SDK.
*   **Negative:** `ADMIN_BASE` must match between the build (asset URLs, router) and the runtime (server mount); the deployment has to keep them in lockstep.
