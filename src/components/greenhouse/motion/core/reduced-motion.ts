'use client'

/**
 * `prefers-reduced-motion` contract — portable. The canonical conditions object
 * is consumed by `useGreenhouseGSAP`'s `gsap.matchMedia()` so reduced-motion is
 * baked into the engine, not opt-in per surface. A surface CANNOT ship motion
 * that ignores the user's reduced-motion preference.
 */

export const MOTION_MEDIA_CONDITIONS = {
  reduced: '(prefers-reduced-motion: reduce)',
  ok: '(prefers-reduced-motion: no-preference)'
} as const

/** Synchronous read — for non-GSAP code paths (e.g. choosing a CSS class). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia(MOTION_MEDIA_CONDITIONS.reduced).matches
}
