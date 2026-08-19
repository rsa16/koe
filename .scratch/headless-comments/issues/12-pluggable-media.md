# 12 — Pluggable Media (imgbb Upload)

**What to build:** The widget allows users to select an image, uploads it directly to imgbb using the client-side provider key, and inserts the markdown image embed into their draft.

**Blocked by:** 05 — Markdown Rendering & Sanitization

**Status:** ready-for-agent

- [ ] Media provider abstraction in the `sdk` package.
- [ ] Imgbb provider implementation using a client-side API key.
- [ ] Widget UI includes an image upload button.
- [ ] On file selection, widget uploads directly to the provider, receives the URL, and inserts `![image](url)` into the markdown editor.