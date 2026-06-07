/**
 * Greenhouse Motion — public surface.
 *
 * The canonical motion primitive for the cinematic / orchestrated / scroll tier,
 * built on GSAP. Simple hover/tap/toggle/focus stay in CSS (the theme) — this
 * module is NOT a replacement for CSS transitions.
 *
 * Consume `<Motion>` (declarative) or `useGreenhouseGSAP` (imperative escape
 * hatch). Only modules under `src/components/greenhouse/motion/**` may import
 * `gsap` directly — enforced by `greenhouse/no-direct-gsap-in-views`.
 */

// Declarative primitive
export { Motion, type MotionProps } from './Motion'

// Variants + kinds
export {
  MOTION_VARIANTS,
  type MotionVariant,
  type MotionBuild,
  type MotionTimeline,
  type ResolvedMotionOptions
} from './variants'
export { MOTION_KIND_TO_VARIANT, DEFAULT_MOTION_VARIANT, resolveVariant, type MotionKind } from './kinds'

// Portable core (tokens, hook, reduced-motion)
export {
  MOTION_DURATION_MS,
  MOTION_DURATION_S,
  MOTION_EASE,
  motionCss,
  motionGsap,
  cssCubicBezier,
  ensureMotionRegistered,
  MOTION_MEDIA_CONDITIONS,
  prefersReducedMotion,
  useGreenhouseGSAP,
  type MotionDurationToken,
  type MotionEaseToken,
  type GreenhouseGsapContext,
  type UseGreenhouseGsapOptions
} from './core'

// View Transitions tier (same-document navigation — not GSAP)
export { default as ViewTransitionLink } from './ViewTransitionLink'
