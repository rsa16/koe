# 6. Auto-derive network blocks from user bans and capture client IPs

Date: 2026-10-13

## Status

Accepted

## Context

A banned guest can mint a fresh anonymous identity and keep acting; banning a `User` alone does not stop them, and koe captures no IPs anywhere. Rate limiting bounds frequency but never stops a re-offender, and it already keys guests by IP only because the server sets no `trustProxy` — so behind a reverse proxy every guest shares one bucket today.

## Decision

Capture client IPs on write requests (all roles) into a dedicated store with bounded retention, and when an admin bans a `User`, auto-insert a time-boxed **Network Block** for each distinct captured IP. Blocks are matched by exact address, enforced write-only on a dedicated preHandler, reject with `403` Problem Details, apply regardless of the caller's later identity, and are independent of the User's status (unbanning does not clear them). Only admins may ban, so only admins create blocks; admins may list and revoke but not manually create in v1. Authenticated admin requests bypass enforcement to avoid self-lockout. Capture is gated by a feature flag defaulting off, and IPs expire on the same window as anonymous pruning.

## Considered Options

- **Manual blocks only** (rejected): a moderator must notice the evasion before it can be stopped — too late by construction.
- **Extending the rate limiter** (rejected): a different concern with a different response shape; frequency capping never stops a persistent re-offender.

## Consequences

- Exact-address matching leaves an IPv6 `/64` evasion hole; documented rather than papered over.
- Auto-propagation has large blast radius on shared IPs (CGNAT, offices, VPN exits), mitigated by time-boxing, write-only scope, and admin-only creation.
- Storing IPs is privacy-sensitive; bounded retention plus a default-off flag give self-hosters an out.
