/**
 * AXIS chart palette — TASK-1053. Canonical SoT for ALL chart series color.
 * Self-contained ("rica en sí misma"): NOT derived from brand/semantic palettes,
 * so a chart series is never confused with a UI status signal.
 *
 * Two purpose-built sub-palettes (analysis: one categorical + one directional
 * cover every chart type — no per-chart-type palettes):
 *   • categorical — arbitrary series (spaces, clients, expense categories, members,
 *     CSC phases via subset). NO order/meaning. Legend/labels ALWAYS (color-never-alone).
 *   • directional — Finance & deltas (cashflow in/out, P&L +/-, KPI variation,
 *     waterfall). positive/negative/neutral. ALWAYS pair with +/- sign or ▲/▼ icon.
 *
 * --- Palette "Deep-bright" (operator-approved 2026-06-08) ---
 * Re-analyzed vibrant 6: CVD-min ΔE 12.9 (deuteranopia/protanopia/tritanopia all ≥10
 * → distinguishable for colorblind), clash-min ΔE 23 vs the 4 semantics
 * (info/success/warning/error → never confused with a status), chroma ≈73 (vibrant).
 * Dark variant lifts only the dark indigo (#5145e0→#7b72f0) to stay visible on
 * charcoal (≥3:1) while preserving the lightness spread that keeps it CVD-safe (13.2).
 *
 * --- Directional CVD ---
 * positive/negative (green/red) is deuteranopia-UNSAFE color-alone (the classic trap)
 * → ALWAYS a +/- sign or ▲/▼ icon. neutral = subtotal/baseline (waterfall, zero line).
 *
 * Rules: every chart series sources from here. NEVER hex inline; NEVER pull a
 * categorical series from theme.palette.{success,warning,error,info}. Domain palettes
 * (cscPhase) derive from `categorical` (subset). Keep this file pure (no deps).
 */

/** Categorical series palette (light) — Deep-bright, ≤6 series, legend mandatory. */
export const axisChartCategorical = [
  '#5145e0', // 1 · indigo
  '#1fba85', // 2 · verde
  '#fb7a00', // 3 · naranja
  '#d633c9', // 4 · magenta
  '#3cc9f0', // 5 · cian
  '#9be036' // 6 · lima
] as const

/** Categorical series palette (dark) — only the dark indigo lifted; rest visible on charcoal. */
export const axisChartCategoricalDark = [
  '#7b72f0', // 1 · indigo (lifted)
  '#1fba85', // 2 · verde
  '#fb7a00', // 3 · naranja
  '#d633c9', // 4 · magenta
  '#3cc9f0', // 5 · cian
  '#9be036' // 6 · lima
] as const

/** Directional palette (light) — Finance/deltas. NEVER color-only: +/- sign or ▲/▼ icon. */
export const axisChartDirectional = {
  positive: '#3dba5d',
  negative: '#ff4d49',
  neutral: '#94a3b8'
} as const

/** Directional palette (dark) — lifted for charcoal visibility. */
export const axisChartDirectionalDark = {
  positive: '#4ed17a',
  negative: '#ff6e6b',
  neutral: '#aeb7c4'
} as const
