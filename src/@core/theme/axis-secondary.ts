/**
 * Greenhouse secondary brand-role layer — Tidal Teal (2026-07-18).
 *
 * `secondary` is intentionally distinct from both primary/info blue and success
 * emerald. The primitive ramp lives in `axis-tokens`; this layer maps it to
 * mode-aware functional roles:
 *
 * - light: 700 ink/fill + white text (5.77:1), 500 accent, 800 active;
 * - dark: 400 ink/fill + Midnight text (7.25:1), 300 accent, 500 active.
 *
 * The dark mapping is deliberate: reusing 700 on charcoal would make outlined
 * controls and text too quiet. The emergency build-time kill switch can revert
 * both modes to the legacy Efeonce azure, but Tidal Teal is canonical/default.
 *
 * Decision: GREENHOUSE_SECONDARY_TEAL_COLOR_DECISION_V1.md.
 */

import { axisRamp } from './axis-tokens'

export type SecondaryRole = {
  main: string
  light: string
  dark: string
  contrastText: string
}

export type SecondaryPaletteMode = 'light' | 'dark'

/** Build-time kill-switch. Default ON → Tidal Teal; env='false' reverts. */
export const isGreenhouseSecondaryTealEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_GREENHOUSE_SECONDARY_TEAL_ENABLED !== 'false'

/**
 * Legacy secondary — EXACT current runtime values (Efeonce azure). Flag OFF must
 * be bit-for-bit identical to pre-flip behavior.
 */
const legacySecondary = {
  main: '#023C70',
  light: '#035A9E',
  dark: '#022A4E',
  contrastText: '#FFFFFF'
} as const satisfies SecondaryRole

export const greenhouseSecondaryPalette = {
  light: {
    main: axisRamp.secondary[700],
    light: axisRamp.secondary[500],
    dark: axisRamp.secondary[800],
    contrastText: '#FFFFFF'
  },
  dark: {
    main: axisRamp.secondary[400],
    light: axisRamp.secondary[300],
    dark: axisRamp.secondary[500],
    contrastText: '#022A4E'
  }
} as const satisfies Record<SecondaryPaletteMode, SecondaryRole>

/** Resolve the active secondary role per the rollout flag. */
export const resolveSecondaryPalette = (mode: SecondaryPaletteMode = 'light'): SecondaryRole =>
  isGreenhouseSecondaryTealEnabled() ? greenhouseSecondaryPalette[mode] : legacySecondary
