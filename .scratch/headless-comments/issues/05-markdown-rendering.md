# 05 — Markdown Rendering & Sanitization

**What to build:** The `renderer` package processes markdown safely into HTML (`body_html`) using a strict allowlist. The widget renders safe HTML instead of raw text.

**Blocked by:** 04 — Tracer Bullet: Create & Read Comments

**Status:** ready-for-agent

- [ ] `renderer` package created wrapping `remark` and `rehype-sanitize`.
- [ ] Sanitization allowlist configured (blocks raw HTML, scripts; allows images, links, basic formatting).
- [ ] Comment creation/update logic modified to generate `body_html` alongside `body_md`.
- [ ] Widget updated to safely inject `body_html` into the DOM.