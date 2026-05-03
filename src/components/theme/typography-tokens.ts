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
