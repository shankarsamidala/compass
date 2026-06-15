# ADR-0003: Tiered design tokens, dark/black-only

**Status:** Accepted · 2026-06-13

## Context
natively's auth started with hardcoded hex → drift and painful re-skins. We want one source of
truth for color/spacing and a black-only aesthetic aligned with natively's cool dark palette.

## Decision
- **Dark/black-only** (no light mode, no theme switching) for now.
- **Three token tiers:** primitive (raw palette) → semantic (`bg`, `fg`, `accent`, `line`, status)
  → component. Authored in `packages/tokens`, surfaced as CSS variables + mapped to Tailwind.
- Components use **semantic utilities only** (`bg-surface`, `text-fg-muted`, `border-line`,
  `bg-accent`) — never hardcoded hex.
- Palette values come from natively's dark theme (cool near-black, blue accent `#83a6ff`).
- Build on accessible primitives (focus ring token, contrast-checked text tiers).

## Consequences
- ✅ Re-skin / future multi-brand = change tokens, zero component edits.
- ✅ Consistent look across apps once `tokens` is shared.
- ⚠️ Light mode, if ever needed, is additive (add a theme scope) — not a rewrite.
