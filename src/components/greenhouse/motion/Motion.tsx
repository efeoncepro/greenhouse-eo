'use client'

/**
 * `<Motion>` — the declarative motion primitive (Primitive + Variants + Kinds).
 *
 * Owns the scope ref, reduced-motion handling, cleanup and token resolution so
 * product surfaces never touch GSAP imperatively for the common cinematic
 * cases. For bespoke sequences use the `timeline` variant with a `build`
 * callback, or `useGreenhouseGSAP` directly.
 *
 *   <Motion kind='listMount'>{rows}</Motion>
 *   <Motion variant='entrance' duration='medium'>{panel}</Motion>
 *   <Motion variant='timeline' build={(ctx, tl) => tl.from('.a', { y: 12 }).from('.b', { y: 12 }, '<0.1')}>…</Motion>
 */

import { createElement, useRef, type CSSProperties, type ElementType, type ReactNode, type Ref } from 'react'

import {
  MOTION_DURATION_S,
  motionGsap,
  useGreenhouseGSAP,
  type MotionDurationToken,
  type MotionEaseToken
} from './core'
import { resolveVariant, type MotionKind } from './kinds'
import { VARIANT_BUILDERS, type MotionBuild, type MotionVariant, type ResolvedMotionOptions } from './variants'

const DEFAULT_DURATION_BY_VARIANT: Record<MotionVariant, MotionDurationToken> = {
  entrance: 'medium',
  stagger: 'standard',
  scrollReveal: 'medium',
  timeline: 'medium'
}

export interface MotionProps {
  /** Explicit functional mode. Takes precedence over `kind`. */
  variant?: MotionVariant
  /** Semantic use case — resolves to a variant. */
  kind?: MotionKind
  /** Element/component to render as the animated scope. Default `'div'`. */
  as?: ElementType
  children: ReactNode
  /** Duration token override. */
  duration?: MotionDurationToken
  /** Easing token override. Default `emphasized`. */
  ease?: MotionEaseToken
  /** Delay in seconds. */
  delay?: number
  /** Translate distance (px) for entrance/stagger/scrollReveal. Default 8. */
  distance?: number
  /** Seconds between staggered children. Default 0.06. */
  stagger?: number
  /** ScrollTrigger `start` for scrollReveal. Default `'top 85%'`. */
  start?: string
  /** Skip the animation entirely (content renders in its natural state). */
  disabled?: boolean
  /** Sequence builder — required for the `timeline` variant. */
  build?: MotionBuild
  className?: string
  style?: CSSProperties
}

export function Motion({
  variant,
  kind,
  as = 'div',
  children,
  duration,
  ease = 'emphasized',
  delay = 0,
  distance = 8,
  stagger = 0.06,
  start = 'top 85%',
  disabled = false,
  build,
  className,
  style
}: MotionProps) {
  const scopeRef = useRef<HTMLElement | null>(null)
  const resolvedVariant = resolveVariant({ variant, kind })

  const options: ResolvedMotionOptions = {
    duration: MOTION_DURATION_S[duration ?? DEFAULT_DURATION_BY_VARIANT[resolvedVariant]],
    ease: motionGsap.ease[ease],
    delay,
    distance,
    stagger,
    start,
    reducedDuration: MOTION_DURATION_S.instant
  }

  useGreenhouseGSAP(
    ctx => {
      if (disabled) return

      const scope = scopeRef.current

      if (!scope) return

      VARIANT_BUILDERS[resolvedVariant]({ ctx, scope, options, build })
    },
    { scope: scopeRef, dependencies: [resolvedVariant, disabled] }
  )

  return createElement(
    as,
    { ref: scopeRef as Ref<never>, className, style },
    children
  )
}
