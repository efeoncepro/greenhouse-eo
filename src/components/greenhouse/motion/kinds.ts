'use client'

/**
 * Semantic kinds → official variant resolver (Primitive + Variants + Kinds).
 *
 * A `kind` is the domain/use-case label a consumer reaches for; it must resolve
 * to one of the official `MotionVariant`s before any animation behavior is
 * chosen. Add domain kinds here — never branch on raw kind strings in surfaces.
 */

import type { MotionVariant } from './variants'

export const MOTION_KIND_TO_VARIANT = {
  /** Choreographed hero reveal (eyebrow → headline → cta). */
  heroIntro: 'timeline',
  /** A list/grid mounting its rows one after another. */
  listMount: 'stagger',
  /** A page section revealing as it scrolls into view. */
  sectionReveal: 'scrollReveal',
  /** A KPI value animating in (count-up handled in the build callback). */
  kpiCountUp: 'timeline',
  /** A panel/card entering on mount. */
  panelEnter: 'entrance',
  /** A card revealing on scroll. */
  cardReveal: 'scrollReveal'
} as const satisfies Record<string, MotionVariant>

export type MotionKind = keyof typeof MOTION_KIND_TO_VARIANT

export const DEFAULT_MOTION_VARIANT: MotionVariant = 'entrance'

/** Explicit `variant` wins; else resolve `kind`; else the safe default. */
export function resolveVariant(input: { variant?: MotionVariant; kind?: MotionKind }): MotionVariant {
  if (input.variant) return input.variant
  if (input.kind) return MOTION_KIND_TO_VARIANT[input.kind]

  return DEFAULT_MOTION_VARIANT
}
