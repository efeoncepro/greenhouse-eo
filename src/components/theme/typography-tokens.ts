/**
 * Typography tokens — line-height namespace canónico.
 *
 * Source of truth: docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md §3.6 (v1.3+).
 *
 * Cada variant del theme y todo consumer externo (cuando emerja) debe
 * leer line-heights desde este namespace, NO declarar números mágicos
 * inline. Una calibración futura toca un solo lugar.
 *
 * Disponible en runtime vía `theme.lineHeights.<token>` (ver
 * `src/components/theme/types.ts` para el type augmentation).
 *
 * Calibrado para Geist Sans @ root font 13.125px de Vuexy. Geist
 * tiene x-height ligeramente más bajo que Inter/DM Sans, lo cual
 * hace que ratios `<1.5` se sientan cramped en transición a body —
 * de ahí que `body` y la mayoría del producto UI estén en 1.5
 * (también piso WCAG 1.4.12 reflow override).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Typography primitives + scale (Source of Truth) — TASK-1036
//
// Mirror of the AXIS color pattern (`axis-tokens.ts` primitives →
// `axis-semantic.ts` roles → consumed by `mergedTheme` + drift-guarded):
//   primitives (families/weights/sizes/lineHeights/spacing/features)
//     → `typographyScale` (composed, keyed by the CANONICAL semantic name)
//       → consumed by `mergedTheme.ts` (runtime) + DESIGN.md (contract)
//         → pinned by `typography-drift.test.ts` (fails CI on any divergence)
//
// Why this exists: before TASK-1036 the canonical font-size/weight/family of
// the product variants lived in `src/@core/theme/typography.ts` (Vuexy core,
// read-only) and `mergedTheme` inherited them by deepmerge. The values matched
// the contract, but they were sourced OUTSIDE the Greenhouse SoT and nothing
// pinned them — a silent break on any Vuexy upgrade. This scale brings the
// canonical values into Greenhouse ownership.
//
// Contract names (DESIGN.md `typography:`) ↔ MUI runtime variant names are
// reconciled by `TYPOGRAPHY_VARIANT_BRIDGE` below (verified in CI, not a manual
// table). DESIGN.md keeps semantic names (`section-title`, `label-md`, …);
// the runtime keeps standard MUI variant names (`h5`, `button`, …).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Font family stacks. Exactly two active families (DESIGN.md / V1 §3.1):
 * Poppins for display (`headline-*`, `page-title`, `surface-hero-title`),
 * Geist for everything else.
 * `monospace` is prohibited — numeric variants use Geist + `tabular-nums`.
 */
export const fontFamilies = {
  display: "var(--font-poppins), 'Poppins', system-ui, -apple-system, sans-serif",
  text: "var(--font-geist), 'Geist', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
} as const

/** Canonical numeric weights. Greenhouse uses 400/600/700/800 (500 reserved). */
export const fontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800
} as const

/**
 * Canonical font-size ramp (rem; px noted at Vuexy root 13.125px is relative —
 * rem here is relative to the standard 16px the contract documents).
 * Keyed by t-shirt step; the composed `typographyScale` references these.
 */
export const fontSizes = {
  surfaceHero: '2.125rem', // 34 — surface-hero-title (primary full-page/workbench title only)
  '5xl': '2rem', // 32 — headline-display
  '4xl': '1.75rem', // 28 — kpi-value
  '3xl': '1.5rem', // 24 — headline-lg
  '2xl': '1.25rem', // 20 — headline-md
  xl: '1.125rem', // 18 — section-title
  lg: '1rem', // 16 — page-title / body-lg / label-lg
  md: '0.9375rem', // 15 — label-md
  sm: '0.875rem', // 14 — body-md / numeric-id
  xs: '0.8125rem', // 13 — body-sm / numeric-amount / label-sm
  '2xs': '0.75rem' // 12 — overline
} as const

/** Letter-spacing primitives used by the scale. */
export const letterSpacings = {
  // TASK-1042 follow-up: letter-spacing en `em` (relativo al font-size del token),
  // no `px` — escala con la preferencia de fuente del usuario, igual que el
  // font-size en rem. Valores ≈ los px previos: caps 1px@12px≈0.08em, metadata
  // 0.4px@13px≈0.03em (diferencia sub-pixel, ahora escala bien).
  caps: '0.08em', // overline (uppercase tight)
  metadata: '0.03em', // body-sm (timestamps, "sugerido")
  numeric: '0.01em' // numeric-id column breathing
} as const

/** Font-feature primitives. Tabular numerals for numeric variants. */
export const fontFeatures = {
  tabularNums: 'tabular-nums'
} as const

export const lineHeights = {
  /**
   * Display moments donde la compresión es señal intencional.
   * KPI hero (`kpiValue`), número grande de dashboard, total dock.
   */
  display: 1.05,

  /**
   * Display headings (Poppins). Tight feel para hero, headline y subheading
   * de marketing. Aplica a `h1`, `h2`, `h3`.
   */
  heading: 1.25,

  /**
   * Surface hero title (`surfaceHeroTitle`). Compacta el titulo primario de
   * una surface full-page/workbench sin convertirlo en hero marketing. Uso
   * estrecho: page/workbench headers aprobados e identity headers principales.
   */
  surfaceHero: 1.15,

  /**
   * Page title en product UI (`h4`). Levemente más relajado que `heading`
   * porque convive con body inmediatamente debajo.
   */
  pageTitle: 1.4,

  /**
   * Metadata, captions, helper text. Levemente más tight que `body` para
   * compensar el font-size más chico (13px vs 15-16px de body).
   * Aplica a `caption`.
   */
  metadata: 1.45,

  /**
   * Product UI baseline. Aplica a `body1`, `body2`, `h5`, `h6`,
   * `subtitle1`. Convergente con Linear / Stripe Dashboard / Vercel app
   * (Geist-based) y piso WCAG 1.4.12 (text-spacing override).
   * **No bajar de 1.5 para variants de párrafo / lectura larga.**
   */
  body: 1.5,

  /**
   * Numeric runs requiring column breathing. Aplica a `monoId`,
   * `monoAmount`. La leve apertura sobre `body` ayuda a que las cifras
   * en columnas tabulares no se peguen verticalmente.
   */
  numericDense: 1.54
} as const

export type LineHeightToken = keyof typeof lineHeights

// ─────────────────────────────────────────────────────────────────────────────
// typographyScale — the composed Source of Truth (TASK-1036)
//
// Keyed by the CANONICAL semantic token name (matches DESIGN.md `typography:`).
// Each entry is a complete, spreadable CSS object: `mergedTheme` spreads it onto
// the bridged MUI variant; DESIGN.md mirrors the same values; the drift-guard
// pins runtime ≡ scale ≡ contract.
//
// Coverage note (slice ordering):
//   - S0 wires the variants `mergedTheme` already sets explicitly (headlines,
//     body, caption, overline, numeric, kpi) — pure no-op refactor.
//   - S1 wires `sectionTitle`/`labelMd` (→ h5/button) which today inherit their
//     font-size from the read-only Vuexy coretheme; values are identical, so it
//     stays no-op while moving ownership into the SoT.
//   - `labelLg`/`labelSm` have NO standard MUI variant (control text is realized
//     via component sizes — `<Button size>`, `<Chip>`); S2 wires them into the
//     control-text overrides. They are in the scale (contract-complete) but NOT
//     in `TYPOGRAPHY_VARIANT_BRIDGE`.
// ─────────────────────────────────────────────────────────────────────────────

export interface TypographyToken {
  fontFamily: string
  fontSize: string
  mobileFontSize?: string
  fontWeight: number
  lineHeight: number
  letterSpacing?: string
  fontVariantNumeric?: string
}

export const typographyScale = {
  // Display (Poppins) — headlines + page title
  headlineDisplay: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes['5xl'],
    fontWeight: fontWeights.extrabold,
    lineHeight: lineHeights.heading
  },
  headlineLg: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.heading
  },
  headlineMd: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.heading
  },
  pageTitle: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes['2xl'], // 20 — TASK-1038: 16→20, arregla la inversión (page-title ≥ section-title)
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.pageTitle
  },
  surfaceHeroTitle: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes.surfaceHero,
    mobileFontSize: fontSizes['4xl'],
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.surfaceHero
  },

  // Section title (Geist) — bridged to h5
  sectionTitle: {
    fontFamily: fontFamilies.text,
    fontSize: fontSizes.lg, // 16 — TASK-1038: 18→16, subhead bajo page-title (distinto del body por peso)
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.body
  },

  // Subheader (Geist) — bridged to subtitle1 (card subheader, list item primary).
  // Runtime-only token: no DESIGN.md contract equivalent (the contract has no
  // 400-weight 15px subtitle); it owns the live MUI `subtitle1` value.
  subheader: {
    fontFamily: fontFamilies.text,
    fontSize: fontSizes.sm, // 14 — TASK-1038: 15→14, elimina el paso 15 (= body-md)
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.body
  },

  // Control-text / label ramp (Geist). labelMd bridged to `button` in S1;
  // labelLg/labelSm realized via component sizes in S2 (no standard MUI variant).
  labelLg: {
    fontFamily: fontFamilies.text,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.body
  },
  labelMd: {
    fontFamily: fontFamilies.text,
    fontSize: fontSizes.sm, // 14 — TASK-1038: 15→14, elimina el paso 15 (Material Label-L / Stripe). variant button.
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.body
  },
  labelSm: {
    fontFamily: fontFamilies.text,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.metadata
  },

  // Body (Geist)
  bodyLg: {
    fontFamily: fontFamilies.text,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.body
  },
  bodyMd: {
    fontFamily: fontFamilies.text,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.body
  },
  bodySm: {
    fontFamily: fontFamilies.text,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.metadata,
    letterSpacing: letterSpacings.metadata
  },
  disclosureText: {
    fontFamily: fontFamilies.text,
    fontSize: fontSizes['2xs'],
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.metadata,
    letterSpacing: letterSpacings.metadata
  },

  // Overline (Geist, uppercase tight). line-height 1.167 = contract value,
  // aligns the previously coretheme-inherited 1.16667 (sub-pixel, no-op).
  overline: {
    fontFamily: fontFamilies.text,
    fontSize: fontSizes['2xs'],
    fontWeight: fontWeights.semibold,
    lineHeight: 1.167,
    letterSpacing: letterSpacings.caps
  },

  // Numeric (Geist + tabular-nums) + KPI
  numericId: {
    fontFamily: fontFamilies.text,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    lineHeight: lineHeights.numericDense,
    letterSpacing: letterSpacings.numeric,
    fontVariantNumeric: fontFeatures.tabularNums
  },
  numericAmount: {
    fontFamily: fontFamilies.text,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.numericDense,
    fontVariantNumeric: fontFeatures.tabularNums
  },
  kpiValue: {
    fontFamily: fontFamilies.text,
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.extrabold,
    lineHeight: lineHeights.display,
    fontVariantNumeric: fontFeatures.tabularNums
  }
} as const satisfies Record<string, TypographyToken>

export type TypographyTokenName = keyof typeof typographyScale

/**
 * Bridge: canonical token ↔ MUI runtime variant name (1:1). The reconciliation
 * of L1 (vocabulary divergence) as CODE, verified in CI by
 * `typography-drift.test.ts` (TASK-1036). Each token maps to exactly one variant.
 *
 * NOT in this map:
 *   - `labelLg` / `labelSm` — control-text realized via component sizes
 *     (`<Button size>`, `<Chip>`), not standard MUI variants (S2).
 *   - `h6` — a SECONDARY consumer of the `labelMd` value (inline bold label;
 *     prefer `subtitle1`/`section-title` in new code). It shares `labelMd`'s
 *     value, so it can't share the 1:1 bridge slot; it's owned + pinned via a
 *     dedicated `SECONDARY_VARIANT_TOKENS` entry below.
 */
export const TYPOGRAPHY_VARIANT_BRIDGE = {
  headlineDisplay: 'h1',
  headlineLg: 'h2',
  headlineMd: 'h3',
  pageTitle: 'h4',
  surfaceHeroTitle: 'surfaceHeroTitle',
  sectionTitle: 'h5',
  subheader: 'subtitle1',
  labelMd: 'button',
  bodyLg: 'body1',
  bodyMd: 'body2',
  bodySm: 'caption',
  disclosureText: 'disclosureText',
  overline: 'overline',
  numericId: 'monoId',
  numericAmount: 'monoAmount',
  kpiValue: 'kpiValue'
} as const satisfies Partial<Record<TypographyTokenName, string>>

/**
 * Secondary runtime variants that reuse an existing token's value (no distinct
 * contract token). Owned + pinned so a Vuexy coretheme drift is caught, but kept
 * out of the 1:1 contract bridge.
 */
export const SECONDARY_VARIANT_TOKENS = {
  h6: 'labelMd',
  // subtitle2 (13/400) era una variante MUI fuera del bridge con ~267 consumidores
  // (tooltip/badge/list-secondary y más). TASK-1038 la trae al SoT reusando body-sm
  // (mismo 13/400) — 267 callsites quedan gobernados. NO es label-sm (13/600).
  subtitle2: 'bodySm'
} as const satisfies Record<string, TypographyTokenName>

/**
 * Control-text ramp — the font-size of interactive control labels per size
 * (TASK-1036 S2). Distinct from the label TYPOGRAPHY ramp (`labelLg/Md/Sm`,
 * 16/15/13, for `<Typography>` + the DESIGN.md contract): control text is a
 * separate scale that tracks the component size props.
 *
 * `sm`/`md` already align with existing tokens, so the controls consume those
 * (Button size=small → body-md 14, Button size=medium / Chip → label-md 15).
 * `lg` (17px) is the ONE control-text value not already owned by a typography
 * token — it sits intentionally above `label-lg` (16px), the Vuexy/Material
 * large-control convention. `MuiButton.sizeLarge` consumes it from here so the
 * value lives in the SoT instead of as a magic number in the read-only coretheme.
 *
 * Note (audit correction): the other "control magic numbers" the 2026-06-06 audit
 * cited (Button icon 14/16/20, Chip avatar/icon 13/15, input legend 0.867em) are
 * ICON glyph sizes / structural values, NOT control text — out of typography scope.
 */
export const controlText = {
  sm: fontSizes.sm, // 14 — Button size=small (= body-md)
  md: fontSizes.sm, // 14 — TASK-1038: 15→14 (= label-md). Button size=medium / Chip
  lg: fontSizes.lg // 16 — TASK-1038: 17→16, saca el 17 bespoke (= label-lg)
} as const
