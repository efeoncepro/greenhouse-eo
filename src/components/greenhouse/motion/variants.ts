'use client'

/**
 * Official functional variants for the `<Motion>` primitive. A variant is a
 * *mode* (entrance / stagger / scroll reveal / orchestrated timeline) — never a
 * skin. Each builder receives the GSAP context (with `reduced` baked in by
 * `useGreenhouseGSAP`) and MUST honor reduced-motion.
 *
 * Honest degradation — content is NEVER left hidden:
 *  · If JS never runs, the element stays in its natural (visible) CSS state.
 *  · Builders use `gsap.fromTo(..→ visible)` with `clearProps` so that ON COMPLETE
 *    GSAP removes every inline style it set (opacity/visibility/transform). After
 *    the entrance the element is pure CSS again, so a later React re-render (e.g.
 *    a child chart mounting async) can NEVER leave it stuck at `autoAlpha: 0`.
 *    `overwrite: 'auto'` kills a conflicting tween on the same target instead of
 *    fighting it. This closes the classic `gsap.from` + re-render hazard where an
 *    interrupted `from` orphans the element at `visibility: hidden`.
 */

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import type { GreenhouseGsapContext } from './core'

/** Inline props GSAP set during an entrance — cleared on complete so the element
 *  returns to its natural CSS (visible) state and cannot be left hidden. */
const ENTRANCE_CLEAR_PROPS = 'opacity,visibility,transform'

export const MOTION_VARIANTS = ['entrance', 'stagger', 'scrollReveal', 'timeline'] as const
export type MotionVariant = (typeof MOTION_VARIANTS)[number]

export type MotionTimeline = ReturnType<typeof gsap.timeline>

/** Build callback for the `timeline` variant — write the sequence here. */
export type MotionBuild = (ctx: GreenhouseGsapContext, timeline: MotionTimeline) => void

export interface ResolvedMotionOptions {
  /** Seconds. */
  duration: number
  /** Registered GSAP ease name. */
  ease: string
  /** Seconds. */
  delay: number
  /** Translate distance in px for entrance/stagger/scrollReveal. */
  distance: number
  /** Seconds between staggered children. */
  stagger: number
  /** ScrollTrigger `start` for scrollReveal. */
  start: string
  /** Seconds — collapsed duration used under reduced-motion. */
  reducedDuration: number
}

export interface VariantBuilderArgs {
  ctx: GreenhouseGsapContext
  scope: Element
  options: ResolvedMotionOptions
  build?: MotionBuild
}

export type VariantBuilder = (args: VariantBuilderArgs) => void

let scrollTriggerRegistered = false

/** Lazy registration — ScrollTrigger only loads where scrollReveal is used. */
function ensureScrollTriggerRegistered(): void {
  if (scrollTriggerRegistered) return
  gsap.registerPlugin(ScrollTrigger)
  scrollTriggerRegistered = true
}

// ── Builders ─────────────────────────────────────────────────────────────────

const entrance: VariantBuilder = ({ ctx, scope, options }) => {
  const { gsap: g, reduced } = ctx

  if (reduced) {
    // Cross-fade snap — no positional motion.
    g.fromTo(
      scope,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: options.reducedDuration, ease: 'none', delay: options.delay, clearProps: ENTRANCE_CLEAR_PROPS, overwrite: 'auto' }
    )

    return
  }

  g.fromTo(
    scope,
    { autoAlpha: 0, y: options.distance },
    {
      autoAlpha: 1,
      y: 0,
      duration: options.duration,
      ease: options.ease,
      delay: options.delay,
      clearProps: ENTRANCE_CLEAR_PROPS,
      overwrite: 'auto'
    }
  )
}

const stagger: VariantBuilder = ({ ctx, scope, options }) => {
  const { gsap: g, reduced } = ctx
  const targets = Array.from(scope.children)

  if (targets.length === 0) return

  if (reduced) {
    g.fromTo(
      targets,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: options.reducedDuration, ease: 'none', stagger: 0, clearProps: ENTRANCE_CLEAR_PROPS, overwrite: 'auto' }
    )

    return
  }

  g.fromTo(
    targets,
    { autoAlpha: 0, y: options.distance },
    {
      autoAlpha: 1,
      y: 0,
      duration: options.duration,
      ease: options.ease,
      delay: options.delay,
      stagger: options.stagger,
      clearProps: ENTRANCE_CLEAR_PROPS,
      overwrite: 'auto'
    }
  )
}

const scrollReveal: VariantBuilder = ({ ctx, scope, options }) => {
  const { gsap: g, reduced } = ctx

  // Reduced-motion: the element is already visible by default — do nothing.
  if (reduced) return

  ensureScrollTriggerRegistered()

  g.fromTo(
    scope,
    { autoAlpha: 0, y: options.distance },
    {
      autoAlpha: 1,
      y: 0,
      duration: options.duration,
      ease: options.ease,
      clearProps: ENTRANCE_CLEAR_PROPS,
      overwrite: 'auto',
      scrollTrigger: { trigger: scope, start: options.start, once: true }
    }
  )
}

const timeline: VariantBuilder = ({ ctx, options, build }) => {
  if (!build) return

  const { gsap: g, reduced } = ctx

  const tl = g.timeline({
    delay: options.delay,
    defaults: {
      duration: reduced ? options.reducedDuration : options.duration,
      ease: reduced ? 'none' : options.ease
    }
  })

  build(ctx, tl)
}

export const VARIANT_BUILDERS: Record<MotionVariant, VariantBuilder> = {
  entrance,
  stagger,
  scrollReveal,
  timeline
}
