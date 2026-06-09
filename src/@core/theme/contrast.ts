/**
 * WCAG 2.2 contrast helpers (TASK-1053 — color governance gate).
 *
 * Pure relative-luminance + contrast-ratio math (WCAG 2.x definition). Used by
 * the semantic contrast gate (`axis-semantic-contrast.test.ts`) to fail CI the
 * moment a semantic `main`/`contrastText` pair drops below AA. Reusable by future
 * slices (B1 ink/tint/border/dark-fg) and any contrast probe.
 *
 * Keep this file pure (no theme imports) so it can run in any environment.
 */

/** Parse `#rgb` / `#rrggbb` (with optional 8-digit alpha, alpha ignored) → [r,g,b] 0-255. */
export const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = hex.trim().replace(/^#/, '')

  const expand =
    normalized.length === 3
      ? normalized
          .split('')
          .map(c => c + c)
          .join('')
      : normalized

  const r = parseInt(expand.slice(0, 2), 16)
  const g = parseInt(expand.slice(2, 4), 16)
  const b = parseInt(expand.slice(4, 6), 16)

  return [r, g, b]
}

/** WCAG relative luminance (0 = black, 1 = white). */
export const relativeLuminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex).map(channel => {
    const c = channel / 255

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two hex colors (1.0 → 21.0). Order-independent. */
export const contrastRatio = (a: string, b: string): number => {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)

  return (lighter + 0.05) / (darker + 0.05)
}

/** AA thresholds (WCAG 2.2): normal text 4.5:1, large text / UI components 3:1. */
export const AA_NORMAL_TEXT = 4.5
export const AA_LARGE_TEXT = 3
