'use client'

/**
 * Official functional variants for the `<Motion>` primitive. A variant is a
 * *mode* (entrance / stagger / scroll reveal / orchestrated timeline) — never a
 * skin. Each builder receives the GSAP context (with `reduced` baked in by
 * `useGreenhouseGSAP`) and MUST honor reduced-motion.
 *
 * Honest degradation: every builder uses `gsap.from()` so the element's natural
 * (final) state is the VISIBLE one. If JS never runs, content stays visible —
 * we never leave an element stuck at `opacity: 0`.
 */

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import type { GreenhouseGsapContext } from './core'

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
    g.from(scope, { autoAlpha: 0, duration: options.reducedDuration, ease: 'none', delay: options.delay })

    return
  }

  g.from(scope, {
    autoAlpha: 0,
    y: options.distance,
    duration: options.duration,
    ease: options.ease,
    delay: options.delay
  })
}

const stagger: VariantBuilder = ({ ctx, scope, options }) => {
  const { gsap: g, reduced } = ctx
  const targets = Array.from(scope.children)

  if (targets.length === 0) return

  if (reduced) {
    g.from(targets, { autoAlpha: 0, duration: options.reducedDuration, ease: 'none', stagger: 0 })

    return
  }

  g.from(targets, {
    autoAlpha: 0,
    y: options.distance,
    duration: options.duration,
    ease: options.ease,
    delay: options.delay,
    stagger: options.stagger
  })
}

const scrollReveal: VariantBuilder = ({ ctx, scope, options }) => {
  const { gsap: g, reduced } = ctx

  // Reduced-motion: the element is already visible by default — do nothing.
  if (reduced) return

  ensureScrollTriggerRegistered()

  g.from(scope, {
    autoAlpha: 0,
    y: options.distance,
    duration: options.duration,
    ease: options.ease,
    scrollTrigger: { trigger: scope, start: options.start, once: true }
  })
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
