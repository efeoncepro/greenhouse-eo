/**
 * AXIS design tokens — primitive (reference) layer.
 *
 * AXIS is the name of Efeonce's Design System (multi-brand Efeonce/Kortex/Verk).
 * This file is a FAITHFUL 1:1 MIRROR of the AXIS color tokens. It is the single
 * source of truth in code; AXIS (Figma) is the upstream source of truth.
 *
 * Source: Figma "Design System | Vuexy → AXIS"
 *   fileKey: yyMksCoijfMaIoYplXKZaR
 *   nodes:   11205:5342 (Theme Color · light) + 11205:6238 (Theme Color · dark)
 *
 * Regenerate (do NOT hand-edit values): pull via Figma MCP `get_variable_defs`
 * on the two nodes above and re-emit this file. Scope = Efeonce + GreenHouse only
 * (Kortex/Verk brand variants are out of scope for the Greenhouse runtime).
 *
 * This layer carries the raw AXIS values verbatim. Role mapping (main/light/dark/
 * contrastText) and any accessibility overrides live in the semantic alias layer,
 * NOT here. Keep this file pure.
 */

export type AxisRampStep = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
export type AxisRamp = Record<AxisRampStep, string>
export type AxisOpacityStep = 8 | 16 | 24 | 32 | 38
export type AxisOpacityScale = Record<AxisOpacityStep, string>

/** Full 100→900 ramps, mode-agnostic (constant across light/dark in AXIS). */
export const axisRamp = {
  // Brand · Efeonce Primary
  primary: {
    100: '#79c0ff',
    200: '#51adff',
    300: '#289aff',
    400: '#0085fd',
    500: '#0375db',
    600: '#0066c2',
    700: '#00539d',
    800: '#003b70',
    900: '#002a50'
  },
  // Brand · Efeonce Secondary — TASK-1053 A1b Restraint v1: verde coherente (corrige el
  // hue-shift a teal en 600-900). pop #6ec207 (500) · ink #4b8405 (700, AA blanco 4.56:1).
  secondary: {
    100: '#eef8e1',
    200: '#d9efbf',
    300: '#bfe492',
    400: '#9ad451',
    500: '#6ec207',
    600: '#5ca306',
    700: '#4b8405',
    800: '#396504',
    900: '#284603'
  },
  // Feedback · Info — TASK-1053 Restraint v1: azure (cyan → azul; AA texto-sobre-blanco desde 500, 4.9:1)
  info: {
    100: '#e8f1fd',
    200: '#c2dbf7',
    300: '#94beee',
    400: '#4e90de',
    500: '#1f6fd4',
    600: '#1a5eb8',
    700: '#155cad',
    800: '#114a8c',
    900: '#0c376a'
  },
  // Feedback · Success — TASK-1053 Restraint v1: emerald (AA texto-sobre-blanco desde 500; blanco-sobre-fill 5.05:1)
  success: {
    100: '#e7f6ee',
    200: '#bce6cf',
    300: '#8fd3ae',
    400: '#46a877',
    500: '#157f47',
    600: '#127140',
    700: '#0f5e35',
    800: '#0b4928',
    900: '#073219'
  },
  // Feedback · GreenHouse Warning (amber)
  warning: {
    100: '#ffd773',
    200: '#ffce54',
    300: '#ffc73a',
    400: '#ffbf1f',
    500: '#ffb703',
    600: '#eeaa00',
    700: '#d59800',
    800: '#bd8700',
    900: '#9a6e00'
  },
  // Feedback · Error — TASK-1053 Restraint v1: vermilion (no ladrillo; blanco-sobre-fill 4.6:1 AA en 500)
  error: {
    100: '#fdecec',
    200: '#f5c2c4',
    300: '#ed9094',
    400: '#e25a61',
    500: '#dc2e39',
    600: '#c01d27',
    700: '#9e1820',
    800: '#7b1219',
    900: '#560c11'
  },
  // Neutral · GreenHouse Gray
  gray: {
    100: '#eaeaec',
    200: '#d5d4d8',
    300: '#c0bec5',
    400: '#aba8b1',
    500: '#97939e',
    600: '#827d8b',
    700: '#6d6777',
    800: '#585164',
    900: '#433c50'
  }
} as const satisfies Record<string, AxisRamp>

export type AxisColorFamily = keyof typeof axisRamp

/** Canonical `-500` main per family (the value MUI palette uses as `main`). */
export const axisMain = {
  primary: axisRamp.primary[500],
  secondary: axisRamp.secondary[500],
  info: axisRamp.info[500],
  success: axisRamp.success[500],
  warning: axisRamp.warning[500],
  error: axisRamp.error[500]
} as const

/**
 * Opacity ramps (main @ alpha): 8%, 16%, 24%, 32%, 38%.
 * Used for soft fills (alert/chip backgrounds), hover/selected states.
 * `gray` opacity uses the AXIS overlay base (#2e263d), not gray-500.
 */
export const axisOpacity = {
  primary: { 8: '#0375db14', 16: '#0375db29', 24: '#0375db3d', 32: '#0375db52', 38: '#0375db61' },
  secondary: { 8: '#6ec20714', 16: '#6ec20729', 24: '#6ec2073d', 32: '#6ec20752', 38: '#6ec20761' },
  info: { 8: '#1f6fd414', 16: '#1f6fd429', 24: '#1f6fd43d', 32: '#1f6fd452', 38: '#1f6fd461' },
  success: { 8: '#157f4714', 16: '#157f4729', 24: '#157f473d', 32: '#157f4752', 38: '#157f4761' },
  warning: { 8: '#ffb70314', 16: '#ffb70329', 24: '#ffb7033d', 32: '#ffb70352', 38: '#ffb70361' },
  error: { 8: '#dc2e3914', 16: '#dc2e3929', 24: '#dc2e393d', 32: '#dc2e3952', 38: '#dc2e3961' },
  gray: { 8: '#2e263d14', 16: '#2e263d29', 24: '#2e263d3d', 32: '#2e263d52', 38: '#2e263d61' }
} as const satisfies Record<string, AxisOpacityScale>

export type AxisNeutral = {
  bodyBg: string
  paper: string
  bgWhite: string
  textPrimary: string
  textSecondary: string
  textDisabled: string
  divider: string
  actionHover: string
  snackbar: string
}

/**
 * Per-mode neutrals (the AXIS values — note these differ from the legacy runtime).
 * NOTE: AXIS binds `actionHover` to the same `#e1def50f` token in both modes; the
 * light value is almost invisible on a light surface and is a likely AXIS authoring
 * gap — flagged for reconciliation upstream, mirrored verbatim here for now.
 */
export const axisNeutral = {
  light: {
    bodyBg: '#f8f7fa',
    paper: '#ffffff',
    bgWhite: '#ffffff',
    textPrimary: '#2f2b3de5',
    textSecondary: '#2f2b3db2',
    textDisabled: '#2f2b3d66',
    divider: '#2f2b3d1f',
    actionHover: '#e1def50f',
    snackbar: '#2f2b3d'
  },
  dark: {
    bodyBg: '#25293c',
    paper: '#2f3349',
    bgWhite: '#ffffff',
    textPrimary: '#e1def5e5',
    textSecondary: '#e1def5b2',
    textDisabled: '#e1def566',
    divider: '#e1def51f',
    actionHover: '#e1def50f',
    snackbar: '#f7f4ff'
  }
} as const satisfies Record<'light' | 'dark', AxisNeutral>

/**
 * Full AXIS token bundle, exposed at runtime via `theme.axis` (primitive layer).
 * Consume the SEMANTIC layer (`theme.palette.*`) in components; reach into
 * `theme.axis.ramp.<family>[<step>]` only for the rare case that needs a specific
 * step (e.g. a chart series, a contrast-safe text tint).
 */
export const axisTokens = {
  ramp: axisRamp,
  main: axisMain,
  opacity: axisOpacity,
  neutral: axisNeutral
} as const

export type AxisTokens = typeof axisTokens
