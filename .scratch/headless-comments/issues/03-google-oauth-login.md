# 03 — Google OAuth Login

**What to build:** Users can sign in via Google (`GET /auth/oauth/google`). The identity is linked to their guest session, preventing them from losing their history. A popup `postMessage` flow returns the token to the client.

**Blocked by:** 02 — Core Auth & Guest Users

**Status:** ready-for-agent

- [ ] `arctic` configured for Google OAuth.
- [ ] `GET /auth/oauth/google` endpoint redirects to Google.
- [ ] Callback endpoint handles the OAuth response.
- [ ] Guest user merging logic: if an anonymous session is present, link the new Google identity to the existing `User` row instead of creating a new one.
- [ ] Callback renders a minimal HTML page that sends the token to the opener window via `window.postMessage`.