# 2. Style the widget through semantic tokens, parts, and slots

Date: 2026-10-05

## Status

Accepted

## Context

`<koe-comments>` and `<koe-article-reactions>` currently hardcode their palette as Tailwind slate/blue/red utilities compiled into their shadow root, expose only a handful of `--koe-*` variables, and have no `::part`s. Embedding hosts (starting with otl-site) need to restyle the widgets extensively to fit their own design system, including layout structure — the default look does not fit at all.

## Decision

The widget's styling becomes a contract rather than a hardcoded theme:

- All colours, typography, radii, borders, and spacing resolve from a documented set of semantic `--koe-*` custom properties (surface, text, accent, border, radius, font) that the host populates from its own design tokens.
- Internal elements carry stable `part="..."` attributes so a host can make structural overrides from outside the shadow root.
- Structural regions expose `<slot>`s.

The widget no longer owns the theme: it gains a reactive `theme` (`light | dark`) property, and its built-in toggle is removed (or behind a flag), so the host is the single source of truth.

Considered options: rendering into the light DOM (maximum control, loses encapsulation) and a host-supplied stylesheet property (flexible but ad hoc and untyped).

## Consequences

*   **Positive:** a host can drive the widget from its own design system without forking it.
*   **Negative:** the `--koe-*` names and `part` names become a public interface that must stay stable.
