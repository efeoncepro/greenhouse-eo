/**
 * AXIS chart palette — TASK-1053 (categorical + cashflow). Canonical SoT for
 * multi-series chart colors, separate from the feedback semantics (those are
 * status, these are categorical brand series).
 *
 * Series 1-2 derive from the brand ramp (primary blue + secondary lime); series
 * 3-6 are curated vibrant extensions. Orange (series 3) is the Efeonce **Reach
 * sub-brand** color, formalized here as its chart consumer (no separate UI role —
 * not warning, not CTA). `GH_COLORS.chart.categorical` derives from this layer.
 *
 * --- Colorblind safety (Coblis pre-check, Machado 2009 sim + CIE76 ΔE) ---
 * ⚠️ lime (series 2 #6ec207) and orange (series 3 #ff6500) are MARGINAL under
 *   deuteranopia (ΔE 10.1) and are adjacent in the approved brand order. Charts
 *   consuming this palette MUST carry a legend/labels — color is NEVER the only
 *   encoding (WCAG 1.4.1). Avoid distinguishing lime vs orange by color alone.
 * ⚠️ cashflow positive/negative (green/red) is deuteranopia-UNSAFE (ΔE 8.8 — the
 *   classic red/green trap). ALWAYS pair with a +/- sign or ▲/▼ icon, NEVER color
 *   alone. Other CVD types (protanopia/tritanopia) and all categorical pairs in
 *   protanopia/tritanopia clear ΔE ≥ 15.
 *
 * Dark series are raised/brightened (NOT an inversion) so each stays distinct on
 * the charcoal surface (bodyBg #25293C / paper #2F3349).
 *
 * Keep this file pure (no server-only, no Greenhouse deps beyond axisRamp).
 */

import { axisRamp } from './axis-tokens'

/** Categorical series palette (light mode) — brand-anchored vibrant, ≤6 series. */
export const axisChartCategorical = [
  axisRamp.primary[500], // 1 · azul #0375db (= el acento de marca)
  axisRamp.secondary[500], // 2 · lima #6ec207 (verde de marca, pop)
  '#ff6500', // 3 · naranja — Reach sub-brand
  '#7c3aed', // 4 · violeta
  '#06b6d4', // 5 · cian
  '#ec4899' // 6 · magenta
] as const

/** Categorical series palette (dark mode) — raised so each series stays distinct on charcoal. */
export const axisChartCategoricalDark = [
  '#3b8ee8', // 1 · azul
  '#7fd42a', // 2 · lima
  '#ff8a3d', // 3 · naranja
  '#9b6bf0', // 4 · violeta
  '#22c9e4', // 5 · cian
  '#f25bac' // 6 · magenta
] as const

/** Cashflow directional pair. NEVER color-only — pair with +/- sign or ▲/▼ icon. */
export const axisChartCashflow = {
  positive: '#3dba5d',
  negative: '#ff4d49'
} as const
