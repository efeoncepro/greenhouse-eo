/**
 * Curated semantic feedback SUB-VALUES — pure design-token SoT (TASK-1053 Fase B,
 * relocated by TASK-1048 to be runtime-agnostic).
 *
 * These are pure literal hexes with ZERO dependencies, so EVERY runtime can import
 * them: the UI theme (`@core/theme/axis-semantic` re-exports this), AND server /
 * worker-bundled code (PDF/Excel generators) that CANNOT reach `src/@core` — the
 * Vuexy/AXIS theme layer is excluded from the Cloud Run worker Docker builds
 * (`.dockerignore`). Importing `@core/theme/*` into worker-bundled code breaks the
 * bundle (ICO batch incident 2026-06-08); design-token DATA lives here so it is
 * reachable everywhere without shipping the theme layer to workers.
 *
 * The values are the extra per-role values the MUI palette (main/contrastText)
 * cannot express, needed for the tonal-by-default treatment + dark-mode accents:
 *   - ink     : AA text on white AND on the role's own `tint` (≥5.3:1). NOT `main`.
 *   - tint    : tonal surface background (light mode).
 *   - border  : tonal hairline (light mode).
 *   - darkFg  : AA accent/text on the dark charcoal surface (≥5.98:1 vs #25293c).
 *
 * All verified WCAG 2.2 AA (axis-semantic-contrast.test.ts). Curated (not exact ramp
 * steps); the mode-resolved tonal triple is composed by the factory in
 * `src/components/theme/greenhouse-semantic-tokens.ts`. Changing a value here MUST
 * move DESIGN.md §Color + V1 §8.1.quater in the same PR (drift-guard enforces it).
 */
export const axisSemanticSubValues = {
  success: { ink: '#11703f', tint: '#e7f6ee', border: '#bce6cf', darkFg: '#5fc891' },
  warning: { ink: '#8a5a00', tint: '#fff4d6', border: '#f5d98a', darkFg: '#e8b84b' },
  error: { ink: '#c01d27', tint: '#fdecec', border: '#f5c2c4', darkFg: '#f08a8f' },
  info: { ink: '#155cad', tint: '#e8f1fd', border: '#c2dbf7', darkFg: '#6fb0f0' }
} as const satisfies Record<'success' | 'warning' | 'error' | 'info', {
  ink: string
  tint: string
  border: string
  darkFg: string
}>
