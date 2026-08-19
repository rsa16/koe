# 1. Bearer tokens for API, session cookies for Admin UI

Date: 2026-08-18

## Status

Accepted

## Context

The system must support an embeddable commenting widget that runs on third-party domains (cross-origin), alongside a self-hosted admin UI that runs on the same origin as the API. We need an authentication model that supports both anonymous and authenticated guests securely across origins.

Browser privacy changes (ITP, SameSite enforcement) make cross-origin third-party cookies complex and fragile. Using `SameSite=None` with `Secure` is possible but requires `credentials: true` in CORS and adds CSRF vulnerabilities that must be mitigated with double-submit tokens.

However, the admin UI is a traditional first-party Single Page Application where cookies are simpler and more secure.

## Decision

We will use a **hybrid authentication model**:
- The public REST API (consumed by the SDK and widget) uses **bearer tokens** passed in the `Authorization` header. Access tokens are short-lived (~15 min), and refresh tokens are rotated on every use with reuse detection.
- The Admin UI (`/admin`) uses a **session cookie** with `SameSite=Lax` and `HttpOnly`, plus a CSRF token for state-changing endpoints.
- OAuth login flows for the widget use a popup `postMessage` flow to hand the bearer token back to the cross-origin client safely.

## Consequences

- **Positive**: The public API is entirely free of CSRF vulnerabilities.
- **Positive**: The widget avoids all third-party cookie restrictions and works seamlessly across origins.
- **Negative**: The widget SDK must manage token storage and refresh lifecycles manually.
- **Negative**: Adds complexity to the backend auth module, which now must support two entirely separate transport mechanisms (bearer + refresh vs. cookie) depending on the endpoint surface.