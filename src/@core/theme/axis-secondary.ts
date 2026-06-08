/**
 * AXIS secondary brand-role layer — TASK-1034 (secondary green adoption).
 *
 * AXIS defines `secondary` as the green ramp (`Color Efeonce/Secundary/*`),
 * NOT the legacy Efeonce azure (`#023c70`, which does not exist in AXIS). The
 * runtime is re-adopting the AXIS secondary, gated behind a rollout flag so the
 * azure→green change ships DORMANT and is flipped only after GVC sign-off.
 *
 * --- Which STEP is the functional `main` (the "no todo es lime claro" point) ---
 * The AXIS secondary ramp spans bright lime (100-500: #c6ff7e → #6ec207) into
 * deep green/teal (600-900: #1d9d72 → #03593d). The Greenhouse runtime renders
 * `color="secondary"` almost entirely as TONAL (208) / OUTLINED (33) — never
 * contained (0). In MUI tonal/outlined, `main` drives the TEXT/BORDER color. The
 * bright lime `#6ec207` as text fails legibility (~1.8:1 on a light tint → candy,
 * illegible). So — mirroring the error.main = error-800 a11y decision — the
 * functional `main` is the deep green AXIS secondary-700 `#138760` (white text
 * 4.9:1 ✅; legible as tonal/outlined text on light surfaces). The bright lime
 * lives as `light` for tints/accents. This is the AA-grounded, "use the deeper
 * scale" application — not bright lime everywhere.
 *
 * Contained secondary (rare/none today) = deep green #138760 + white text (clean,
 * AA). Tonal = light green tint + deep green text. Outlined = deep green border+text.
 *
 * Flag: NEXT_PUBLIC_AXIS_SECONDARY_LIME_ENABLED — KILL-SWITCH (default ON since the
 * adopt decision). AXIS green is the canonical secondary; the env var only reverts
 * to legacy azure in an emergency.
 *   unset / anything but 'false'  → AXIS green secondary (canonical, default)
 *   'false'                       → legacy Efeonce azure secondary (emergency revert)
 *
 * Theme-build-time flag (same class as the AXIS neutrals flag; NOT a DB flag).
 */

import { axisRamp } from './axis-tokens'

export type SecondaryRole = {
  main: string
  light: string
  dark: string
  contrastText: string
}

/** Build-time kill-switch. Default ON → AXIS green secondary; env='false' reverts. */
export const isAxisSecondaryLimeEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_AXIS_SECONDARY_LIME_ENABLED !== 'false'

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

/**
 * AXIS secondary — functional main = secondary-700 (deep green, AA-legible as
 * tonal/outlined text); light = secondary-500 (lime accent for tints); dark =
 * secondary-800 (hover/active). contrastText white (deep green carries white AA).
 */
const axisSecondary = {
  main: axisRamp.secondary[700], // TASK-1053 A1b: #4b8405 — crisp green ink, white 4.56:1 AA (era teal #138760)
  light: axisRamp.secondary[500], // #6ec207 — lime accent / tint base (sin cambio)
  dark: axisRamp.secondary[800], // TASK-1053 A1b: #396504 — deeper green hover/active (era #0c7250)
  contrastText: '#FFFFFF'
} as const satisfies SecondaryRole

/** Resolve the active secondary role per the rollout flag. */
export const resolveSecondaryPalette = (): SecondaryRole =>
  isAxisSecondaryLimeEnabled() ? axisSecondary : legacySecondary
