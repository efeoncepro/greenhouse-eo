'use client'

/**
 * `useGreenhouseGSAP` — the canonical imperative escape hatch for GSAP motion.
 * Portable (no Greenhouse deps). Wraps `@gsap/react`'s `useGSAP` so every
 * consumer gets, for free:
 *
 *  · SSR-safe + React-StrictMode-safe execution (effect runs client-side only,
 *    double-invoke tolerant).
 *  · Automatic cleanup — all tweens/timelines created inside the callback are
 *    reverted on unmount or dependency change (`gsap.context`).
 *  · `prefers-reduced-motion` BAKED IN via `gsap.matchMedia()` — the callback
 *    receives `reduced` and MUST branch on it. Reduced-motion auto-reverts when
 *    the media query stops matching.
 *
 * This is the only sanctioned way for product code to touch GSAP imperatively.
 * For declarative cases prefer the `<Motion>` primitive.
 */

import type { RefObject } from 'react'

import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

import { ensureMotionRegistered } from './register'
import { MOTION_MEDIA_CONDITIONS } from './reduced-motion'

ensureMotionRegistered()

export interface GreenhouseGsapContext {
  /** The GSAP instance (plugins + Greenhouse eases already registered). */
  gsap: typeof gsap
  /** `true` when the user prefers reduced motion — branch to snap/cross-fade. */
  reduced: boolean
  /** Raw matchMedia conditions (extend with viewport conditions if needed). */
  conditions: Record<string, boolean>
}

export interface UseGreenhouseGsapOptions {
  /** Ref that scopes selector text + cleanup to a subtree. Strongly recommended. */
  scope?: RefObject<Element | null>
  /** Re-run the build when these change (like an effect dependency array). */
  dependencies?: unknown[]
}

export function useGreenhouseGSAP(
  build: (ctx: GreenhouseGsapContext) => void,
  options: UseGreenhouseGsapOptions = {}
): void {
  const { scope, dependencies = [] } = options

  useGSAP(
    () => {
      const mm = gsap.matchMedia(scope?.current ?? undefined)

      mm.add(MOTION_MEDIA_CONDITIONS, context => {
        const conditions = (context.conditions ?? {}) as Record<string, boolean>

        build({ gsap, reduced: Boolean(conditions.reduced), conditions })
      })

      // matchMedia owns its own context; revert it explicitly on cleanup so no
      // listeners leak when the component unmounts or dependencies change.
      return () => {
        mm.revert()
      }
    },
    { scope: scope as never, dependencies }
  )
}
