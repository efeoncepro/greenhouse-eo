'use client'

/**
 * Idempotent GSAP plugin + CustomEase registration. Portable — no Greenhouse
 * deps. Registers `useGSAP` (so `gsap.registerPlugin(useGSAP)` is satisfied)
 * and the canonical Greenhouse eases as GSAP `CustomEase`s so motion tokens
 * have exact parity with their CSS `cubic-bezier(...)` counterparts.
 *
 * Safe to call any number of times; guarded by a module-level flag so the eases
 * are created once. SSR-safe: registration touches no DOM (CustomEase just
 * computes bézier sample points).
 */

import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { CustomEase } from 'gsap/CustomEase'

import { MOTION_EASE } from './tokens'

let registered = false

export function ensureMotionRegistered(): void {
  if (registered) return

  gsap.registerPlugin(useGSAP, CustomEase)

  for (const ease of Object.values(MOTION_EASE)) {
    // A non-null cubic-bézier means a real curve (linear has `null` + GSAP's
    // built-in `'none'`). CustomEase parses 4 numbers as control points (P1, P2)
    // anchored at (0,0)→(1,1) — identical semantics to CSS `cubic-bezier(...)`.
    if (ease.cubicBezier) {
      CustomEase.create(ease.gsapName, ease.cubicBezier.join(', '))
    }
  }

  registered = true
}
