/**
 * Motion tokens — Greenhouse design-system binding.
 *
 * Mirrors `typography-tokens.ts`: this is the design-system-facing surface for
 * motion tokens. The portable single source of truth for the *values* lives in
 * `src/components/greenhouse/motion/core/tokens.ts` (dependency-free so it can
 * be lifted into other apps). This module re-exports it for discoverability and
 * is the import that `DESIGN.md` §Motion + `GREENHOUSE_DESIGN_TOKENS_V1.md`
 * §Motion reference. Keep DESIGN.md + V1 + this binding in 3-layer parity; the
 * drift-guard test (`core/tokens.test.ts`) pins the scale.
 *
 * Token scale (fixed — extend only via design-system governance):
 *   durations  75 / 150 / 200 / 300 / 400 / 600 ms
 *   easing     emphasized · standard · emphasizedAccelerate · linear
 */

export {
  MOTION_DURATION_MS,
  MOTION_DURATION_S,
  MOTION_EASE,
  motionCss,
  motionGsap,
  cssCubicBezier,
  type MotionDurationToken,
  type MotionEaseToken
} from '@/components/greenhouse/motion/core/tokens'
