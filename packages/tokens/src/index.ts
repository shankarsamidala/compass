/**
 * @compass/tokens — semantic token names (for JS/TS consumers and the Tailwind map).
 * The CSS variable values live in tokens.css (the runtime source of truth).
 */
export const semanticColors = {
  bg: "var(--bg)",
  sidebar: "var(--sidebar)",
  surface: "var(--surface)",
  "surface-raised": "var(--surface-raised)",
  "surface-hover": "var(--surface-hover)",
  border: "var(--border)",
  "border-strong": "var(--border-strong)",
  fg: "var(--fg)",
  "fg-muted": "var(--fg-muted)",
  "fg-subtle": "var(--fg-subtle)",
  "fg-faint": "var(--fg-faint)",
  accent: "var(--accent)",
  "accent-hover": "var(--accent-hover)",
  "accent-fg": "var(--accent-fg)",
  "accent-soft": "var(--accent-soft)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
} as const;

export type SemanticColor = keyof typeof semanticColors;
