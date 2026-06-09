/**
 * Greenhouse Motion — portable core (anillo 0).
 *
 * Dependency-free GSAP foundation: motion token SoT, idempotent plugin + ease
 * registration, the `prefers-reduced-motion` contract, and the
 * `useGreenhouseGSAP` hook. Copy this folder into another app to reuse.
 *
 * IMPORTANT: only modules under `src/components/greenhouse/motion/**` may import
 * `gsap` / `@gsap/react` directly (enforced by the `greenhouse/no-direct-gsap-in-views`
 * lint rule). Product surfaces consume `<Motion>` or `useGreenhouseGSAP`.
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
} from './tokens'

export { ensureMotionRegistered } from './register'
export { MOTION_MEDIA_CONDITIONS, prefersReducedMotion } from './reduced-motion'
export {
  useGreenhouseGSAP,
  type GreenhouseGsapContext,
  type UseGreenhouseGsapOptions
} from './use-greenhouse-gsap'
