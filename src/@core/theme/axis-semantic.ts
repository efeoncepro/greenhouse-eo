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
 * TASK-1053 (dirección D): los fills 500 son oscuros y AA con texto BLANCO →
 *   success #157f47 (5.05:1), info #1f6fd4 (4.9:1), error #dc2e39 (4.6:1).
 *   contrastText = WHITE para esos tres; main = ramp[500] uniforme (se eliminó la
 *   desviación a error-800 de Slice 2b — el ramp dirección D ya es AA-capable en 500).
 * warning #ffb703 es amber brillante (señal de tránsito) → texto OSCURO (INK), nunca
 *   blanco (blanco sobre amber falla; INK pasa ~8:1). contrastText = INK solo aquí.
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
 * TASK-1053 (dirección D): los fills 500 ahora son AA con texto blanco
 * (success #157f47 5.05:1, info #1f6fd4 4.9:1, error #dc2e39 4.6:1) → main = ramp[500]
 * uniforme (sin la desviación a error-800). warning sigue traffic-sign (texto OSCURO).
 */
export const axisSemanticHex = {
  success: axisRamp.success[500],
  warning: axisRamp.warning[500],
  error: axisRamp.error[500],
  info: axisRamp.info[500]
} as const satisfies Record<'success' | 'warning' | 'error' | 'info', string>

export const axisSemanticPalette = {
  success: {
    main: axisRamp.success[500],
    light: axisRamp.success[400],
    dark: axisRamp.success[600],
    contrastText: WHITE // dirección D: emerald oscuro → texto blanco AA (5.05:1)
  },
  warning: {
    main: axisRamp.warning[500],
    light: axisRamp.warning[400],
    dark: axisRamp.warning[600],
    contrastText: INK // amber traffic-sign → texto OSCURO (nunca blanco)
  },
  error: {
    main: axisRamp.error[500], // dirección D: vermilion AA (blanco 4.6:1) — sin desviación a 800
    light: axisRamp.error[400],
    dark: axisRamp.error[600],
    contrastText: WHITE
  },
  info: {
    main: axisRamp.info[500],
    light: axisRamp.info[400],
    dark: axisRamp.info[600],
    contrastText: WHITE // dirección D: azure → texto blanco AA (4.9:1)
  }
} as const satisfies Record<'success' | 'warning' | 'error' | 'info', SemanticRole>
