/**
 * AXIS neutral (surface / text / customColors) palette layer — TASK-1034 Slice 3.
 *
 * Adopts the AXIS neutrals (background, paper, text ramp, surface customColors)
 * into the Greenhouse runtime. AXIS is Efeonce's Design System; the raw values
 * live in `axis-tokens.ts` (`axisNeutral`, the 1:1 Figma mirror). This module
 * maps them into the MUI palette shape and gates the adoption behind a rollout
 * flag so the high-blast-radius dark surface change (legacy navy → AXIS
 * purple-navy) ships dormant and is flipped only after visual sign-off.
 *
 * --- Why an env flag (and NOT home_rollout_flags / a DB flag) ---
 * The MUI theme is built SYNCHRONOUSLY in mergedTheme() on every render (SSR +
 * client), BEFORE any DB is reachable, and is GLOBAL (not per-subject / per-
 * tenant). The home_rollout_flags DB platform (TASK-780) requires an async
 * subject-scoped DB read and is therefore architecturally inapplicable at
 * theme-construction time. This is a THEME-BUILD-TIME rollout flag — the same
 * class as themeConfig.mode / primaryColorConfig that already drive the theme —
 * not a home/shell feature flag. Flip via Vercel env var + redeploy.
 *
 * Flag: NEXT_PUBLIC_AXIS_NEUTRALS_ENABLED — KILL-SWITCH (default ON since TASK-1034
 * Slice 3 flip). AXIS neutrals are the canonical runtime; DESIGN.md (the agent
 * contract) reflects them. The env var only exists to revert in an emergency:
 *   unset / anything but 'false'  → AXIS neutrals (canonical, default)
 *   'false'                       → legacy Greenhouse navy neutrals (emergency revert)
 *
 * Rationale: a feature flag is a temporary rollout mechanism, not a permanent
 * home. Leaving AXIS dormant behind a default-OFF flag while the contract says
 * AXIS creates a permanent contract↔runtime divergence that every future agent
 * must reason about. Flipping the default to ON converges runtime == contract ==
 * SoT == AXIS (single source of truth); the env stays as an instant revert.
 *
 * NOTE: `divider` and `text` already resolve to AXIS via the Vuexy core theme
 * channels (mainColorChannels.light='47 43 61'=#2F2B3D, dark='225 222 245'=
 * #E1DEF5). The legacy fragment intentionally OVERRIDES text with solid hex
 * (current behavior); the AXIS fragment sets the explicit AXIS alpha values.
 * Divider is left to the core channels (already === AXIS divider #2f2b3d1f) and
 * is intentionally not part of these fragments.
 */

import { axisNeutral } from './axis-tokens'

/** Neutral customColors keys this layer owns (surface + text mirrors). */
type NeutralCustomColors = {
  bodyBg: string
  chatBg: string
  greyLightBg: string
  tableHeaderBg: string
  tooltipText: string
  trackBg: string
  bodyText: string
  secondaryText: string
  claimGray: string
}

export type NeutralFragment = {
  background: { default: string; paper: string }
  text: { primary: string; secondary: string; disabled: string }
  customColors: NeutralCustomColors
}

/** Build-time kill-switch. Default ON → AXIS neutrals; env='false' reverts to legacy. */
export const isAxisNeutralsEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_AXIS_NEUTRALS_ENABLED !== 'false'

/**
 * Legacy fragments — EXACT current mergedTheme values. Flag OFF must be
 * bit-for-bit identical to pre-Slice-3 behavior. Do not "improve" these.
 */
const legacyNeutrals = {
  light: {
    background: { default: '#F8F9FA', paper: '#FFFFFF' },
    text: { primary: '#1A1A2E', secondary: '#667085', disabled: '#848484' },
    customColors: {
      bodyBg: '#F8F9FA',
      chatBg: '#F3F5F7',
      greyLightBg: '#FAFBFC',
      tableHeaderBg: '#FFFFFF',
      tooltipText: '#FFFFFF',
      trackBg: '#ECF1F5',
      bodyText: '#1A1A2E',
      secondaryText: '#667085',
      claimGray: '#848484'
    }
  },
  dark: {
    background: { default: '#101827', paper: '#162033' },
    text: { primary: '#F5F7FA', secondary: '#B0B9C8', disabled: '#7A8394' },
    customColors: {
      bodyBg: '#101827',
      chatBg: '#152033',
      greyLightBg: '#202C42',
      tableHeaderBg: '#162033',
      tooltipText: '#0F172A',
      trackBg: '#25314A',
      bodyText: '#F5F7FA',
      secondaryText: '#B0B9C8',
      claimGray: '#7A8394'
    }
  }
} as const satisfies Record<'light' | 'dark', NeutralFragment>

/**
 * AXIS fragments — from axisNeutral (SoT). The dark surface helpers
 * (chatBg / greyLightBg / trackBg / tableHeaderBg / tooltipText) use the Vuexy
 * core AXIS-aligned values, which are authored to sit on the AXIS dark bg
 * (#25293c) / paper (#2f3349) — they replace the legacy navy values that would
 * clash in hue against the new purple-navy surfaces (TASK-1034 operator call).
 */
const axisNeutrals = {
  light: {
    background: { default: axisNeutral.light.bodyBg, paper: axisNeutral.light.paper },
    text: {
      primary: axisNeutral.light.textPrimary,
      secondary: axisNeutral.light.textSecondary,
      disabled: axisNeutral.light.textDisabled
    },
    customColors: {
      bodyBg: axisNeutral.light.bodyBg,
      chatBg: '#F3F2F5',
      greyLightBg: '#FAFAFA',
      tableHeaderBg: axisNeutral.light.paper,
      tooltipText: '#FFFFFF',
      trackBg: '#F1F0F2',
      bodyText: axisNeutral.light.textPrimary,
      secondaryText: axisNeutral.light.textSecondary,
      claimGray: axisNeutral.light.textDisabled
    }
  },
  dark: {
    background: { default: axisNeutral.dark.bodyBg, paper: axisNeutral.dark.paper },
    text: {
      primary: axisNeutral.dark.textPrimary,
      secondary: axisNeutral.dark.textSecondary,
      disabled: axisNeutral.dark.textDisabled
    },
    customColors: {
      bodyBg: axisNeutral.dark.bodyBg,
      chatBg: '#202534',
      greyLightBg: '#353A52',
      tableHeaderBg: axisNeutral.dark.paper,
      tooltipText: axisNeutral.dark.paper,
      trackBg: '#3A3F57',
      bodyText: axisNeutral.dark.textPrimary,
      secondaryText: axisNeutral.dark.textSecondary,
      claimGray: axisNeutral.dark.textDisabled
    }
  }
} as const satisfies Record<'light' | 'dark', NeutralFragment>

/**
 * Resolve the active neutral fragments per the rollout flag.
 * Returns `{ light, dark }`; mergedTheme spreads each into its colorScheme.
 */
export const resolveNeutralFragments = (): Record<'light' | 'dark', NeutralFragment> =>
  isAxisNeutralsEnabled() ? axisNeutrals : legacyNeutrals
