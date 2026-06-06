/**
 * AXIS semantic (alias) layer — maps AXIS primitive ramps to MUI palette roles.
 *
 * Components consume THIS layer (`theme.palette.success.main`, etc.), never the
 * primitive ramps directly. Role mapping per family:
 *   - main  = ramp[500]   (the canonical AXIS main)
 *   - light = ramp[400]   (hover/tint surfaces)
 *   - dark  = ramp[600]   (active/hover-contained)
 *   - contrastText        = AA-validated text color for solid fills (WCAG 2.2 AA)
 *
 * AXIS mains are mode-agnostic (same hex light/dark), so one mapping serves both
 * colorSchemes; only neutrals (Slice 3) differ per mode.
 *
 * --- Accessibility decisions (validated against WCAG 2.2 AA, contrast vs main) ---
 * success #28c76f, warning #ffb703, info #00bad1 are BRIGHT → white text fails
 *   (2.2:1 / 1.7:1 / 2.3:1). Dark ink passes (6.3 / 8.0 / 7.3) → contrastText = INK.
 * error: AXIS error-500 #ff4c51 is NOT AA-usable as a solid-fill main (white text
 *   3.28:1, dark ink 4.17:1 — neither reaches 4.5). So error.main maps to AXIS
 *   error-800 #cc3d41 (white text 4.87:1 ✅) for solid fills; the vibrant #ff4c51
 *   stays as error.light for accents/borders/icons (4.87:1 as UI element on white).
 *   This is a deliberate a11y deviation from the main=ramp[500] rule (TASK-1034
 *   Slice 2b, decision #3) — reconcile with AXIS upstream (the error ramp needs an
 *   AA-capable solid-fill main, or a dedicated solid token).
 */

import { axisRamp } from './axis-tokens'

/** AXIS dark text ink (`#2f2b3d`) — AA contrastText for bright semantic fills. */
const INK = '#2f2b3d'
const WHITE = '#ffffff'

type SemanticRole = {
  main: string
  light: string
  dark: string
  contrastText: string
}

/**
 * Feedback semantic roles derived from AXIS. Applied to both light + dark
 * colorSchemes. `primary` and `secondary` are intentionally NOT here:
 *   - primary stays runtime-driven per tenant (primaryColorConfig.ts).
 *   - secondary (AXIS lime ramp) is a brand-role flip pending explicit decision
 *     (tracked in TASK-1034); its full ramp is still available via theme.axis.
 */
/**
 * Canonical semantic HEX SoT (TASK-1034 Slice 4) for NON-MUI consumers that
 * cannot read `theme.palette` — chart configs, PDF tokens (`@react-pdf`), the
 * `greenhouse-nomenclature` status maps, AI art-direction prompts. These MUST
 * import from here instead of hardcoding `#6ec207`/`#ff6500`/`#bb1954` (the
 * legacy pre-AXIS hexes that drifted from the adopted semantics in Slice 2).
 *
 * Derived from `axisSemanticPalette` below (same source as the MUI theme), so a
 * drift-guard test can assert: theme.palette.<role>.main === axisSemanticHex.<role>
 * === every non-theme consumer. One SoT, zero hardcoded semantic hexes.
 *
 * NOTE error = #cc3d41 (AXIS error-800, the AA-capable solid-fill main from
 * Slice 2b), NOT the vibrant #ff4c51 (which is error.light, accents only).
 */
export const axisSemanticHex = {
  success: axisRamp.success[500],
  warning: axisRamp.warning[500],
  error: axisRamp.error[800],
  info: axisRamp.info[500]
} as const satisfies Record<'success' | 'warning' | 'error' | 'info', string>

export const axisSemanticPalette = {
  success: {
    main: axisRamp.success[500],
    light: axisRamp.success[400],
    dark: axisRamp.success[600],
    contrastText: INK
  },
  warning: {
    main: axisRamp.warning[500],
    light: axisRamp.warning[400],
    dark: axisRamp.warning[600],
    contrastText: INK
  },
  error: {
    // a11y deviation: main = error-800 (AA white text 4.87:1); light = vibrant error-500.
    main: axisRamp.error[800],
    light: axisRamp.error[500],
    dark: axisRamp.error[900],
    contrastText: WHITE
  },
  info: {
    main: axisRamp.info[500],
    light: axisRamp.info[400],
    dark: axisRamp.info[600],
    contrastText: INK
  }
} as const satisfies Record<'success' | 'warning' | 'error' | 'info', SemanticRole>
