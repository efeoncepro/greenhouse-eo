/**
 * Greenhouse semantic feedback tokens — composed roles (TASK-1053 Fase B).
 *
 * Mirror of the AXIS color pattern (`axis-tokens.ts`), the typography SoT
 * (`typography-tokens.ts`) and the elevation factory (`elevation-tokens.ts`):
 * primitives/sub-values → composed semantic roles → consumed by `mergedTheme.ts`
 * (runtime) + DESIGN.md / V1 (contract) → pinned by `greenhouse-semantic-drift.test.ts`
 * (fails CI on any divergence).
 *
 * Why this exists (ADR GREENHOUSE_SEMANTIC_COLOR_SYSTEM_DECISION_V1, Fase B):
 * the MUI palette role only carries `main`/`light`/`dark`/`contrastText`. The
 * tonal-by-default treatment (Restraint v1: a status chip/alert default is TONAL,
 * not a saturated solid — solid reads "admin template 2016") needs three more
 * values per role that the palette cannot express:
 *   - an AA TEXT color that works on a soft surface (`main` fails — warning.main
 *     #ffb703 amber as text is unreadable),
 *   - a soft tonal SURFACE background,
 *   - a soft tonal BORDER,
 * plus a dark-mode accent (`darkFg`) — in dark mode `main` (#157f47 emerald) on
 * charcoal is too dark to read.
 *
 * Runtime access: `theme.greenhouseSemantic.<role>` (see `types.ts` augmentation).
 * Greenhouse primitives (GreenhouseChip `label` variant, future GreenhouseAlert)
 * read the role from the theme — they must NOT hardcode the hex and must NOT use
 * `palette.<role>.main` as a tonal TEXT color (that is the fill, not the ink).
 *
 * Mode-aware: this is a factory (`greenhouseSemanticTokens(mode)`) exactly like
 * `elevationTokens(mode)`. The theme rebuilds on `currentMode` change
 * (theme/index.tsx), so the JS values resolved here are always correct for the
 * active mode. The raw curated sub-values live in the SoT
 * (`axis-semantic.ts` → `axisSemanticSubValues`); this factory composes the
 * mode-resolved tonal triple (`tonalSurface` / `tonalText` / `tonalBorder`).
 *
 *   light: tonalSurface = tint · tonalText = ink · tonalBorder = border
 *   dark : tonalSurface = darkFg wash on paper · tonalText = darkFg · tonalBorder = darkFg @ 36%
 *
 * The dark tonal surface/border use `color-mix(in oklch, …)` against the canonical
 * paper var so they track the AXIS dark neutral without minting new hexes.
 */

// Type Imports
import type { SystemMode } from '@core/types'

import { axisSemanticPalette, axisSemanticSubValues } from '@core/theme/axis-semantic'

export type GreenhouseSemanticRole = 'info' | 'success' | 'warning' | 'error'

export interface GreenhouseSemanticToken {
  /** Canonical role name. */
  role: GreenhouseSemanticRole
  /** Solid fill background (= `palette.<role>.main`). For the `solid` chip variant. */
  fill: string
  /** AA text on the solid fill (= `palette.<role>.contrastText`). */
  onFill: string
  /** AA text on white AND on this role's own `tint` (the canonical semantic ink, NOT `fill`). */
  ink: string
  /** Soft tonal surface background (light-mode curated value). */
  tint: string
  /** Soft tonal hairline (light-mode curated value). */
  border: string
  /** AA accent/text on the dark charcoal surface. */
  darkFg: string
  /** Mode-resolved tonal surface background — the bg the `label` (tonal) variant uses. */
  tonalSurface: string
  /** Mode-resolved tonal text/ink — AA on `tonalSurface`. */
  tonalText: string
  /** Mode-resolved tonal hairline. */
  tonalBorder: string
}

const PAPER = 'var(--mui-palette-background-paper)'

/**
 * Mode-aware semantic feedback token factory. Mirror of `elevationTokens(mode)`.
 * Returns the full role map resolved for the given color mode.
 */
export const greenhouseSemanticTokens = (
  mode: SystemMode
): Record<GreenhouseSemanticRole, GreenhouseSemanticToken> => {
  const dark = mode === 'dark'

  const build = (role: GreenhouseSemanticRole): GreenhouseSemanticToken => {
    const { ink, tint, border, darkFg } = axisSemanticSubValues[role]
    const { main: fill, contrastText: onFill } = axisSemanticPalette[role]

    return {
      role,
      fill,
      onFill,
      ink,
      tint,
      border,
      darkFg,
      tonalSurface: dark ? `color-mix(in oklch, ${darkFg} 16%, ${PAPER})` : tint,
      tonalText: dark ? darkFg : ink,
      tonalBorder: dark ? `color-mix(in oklch, ${darkFg} 36%, transparent)` : border
    }
  }

  return {
    info: build('info'),
    success: build('success'),
    warning: build('warning'),
    error: build('error')
  }
}
