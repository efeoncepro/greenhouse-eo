/**
 * Motion token SoT — portable, ZERO Greenhouse/theme dependencies.
 *
 * This is the single source of truth for motion *values* (durations + easing
 * curves). It is intentionally dependency-free so the whole `motion/core`
 * folder can be lifted into another application and either reused as-is or
 * have its tokens overridden. The Greenhouse design-system binding
 * (`src/components/theme/motion-tokens.ts`) re-exports these for discoverability
 * and parity with the rest of the design system.
 *
 * Canonical duration scale (design-system fixed scale): 75 / 150 / 200 / 300 /
 * 400 / 600 ms. Easing curves match the canonical Material-3-derived set used
 * across the runtime. Seconds + CSS strings are DERIVED from these — never
 * declared in parallel — so they cannot drift. `tokens.test.ts` pins the scale.
 */

// ── Durations (ms = source of truth; seconds + CSS derived) ──────────────────

export const MOTION_DURATION_MS = {
  instant: 75, // tap ack, toggle flip, immediate feedback
  short: 150, // hover, color change, small icon swap, focus ring
  standard: 200, // menu/tooltip in-out, checkbox, accordion
  medium: 300, // modal scale-up, drawer slide, dialog
  long: 400, // same-doc page transition, card flip, large move
  extended: 600 // hero entrance, cinematic emphasis
} as const

export type MotionDurationToken = keyof typeof MOTION_DURATION_MS

/** GSAP works in seconds. Derived from ms — single source, cannot drift. */
export const MOTION_DURATION_S = Object.fromEntries(
  Object.entries(MOTION_DURATION_MS).map(([token, ms]) => [token, ms / 1000])
) as Record<MotionDurationToken, number>

// ── Easing (cubic-bézier control points = source; CSS + GSAP names derived) ──

type EaseDefinition = {
  /** The 4 cubic-bézier control points, or `null` for linear. */
  readonly cubicBezier: readonly [number, number, number, number] | null
  /** Registered GSAP CustomEase id (`'none'` = GSAP's built-in linear). */
  readonly gsapName: string
}

export const MOTION_EASE = {
  /** Default for entrances + most state changes. Decelerated. */
  emphasized: { cubicBezier: [0.2, 0, 0, 1], gsapName: 'gh-emphasized' },
  /** Soft entrances, conservative UI. */
  standard: { cubicBezier: [0.4, 0, 0.2, 1], gsapName: 'gh-standard' },
  /** Exits — leaving the screen fast. */
  emphasizedAccelerate: { cubicBezier: [0.3, 0, 0.8, 0.15], gsapName: 'gh-emphasized-accelerate' },
  /** Loaders, infinite loops, progress bars. */
  linear: { cubicBezier: null, gsapName: 'none' }
} as const satisfies Record<string, EaseDefinition>

export type MotionEaseToken = keyof typeof MOTION_EASE

export const cssCubicBezier = (cp: readonly [number, number, number, number]): string =>
  `cubic-bezier(${cp[0]}, ${cp[1]}, ${cp[2]}, ${cp[3]})`

// ── Derived consumer-facing maps ─────────────────────────────────────────────

/** CSS-side tokens: duration strings (`'300ms'`) + easing strings. */
export const motionCss = {
  duration: Object.fromEntries(
    Object.entries(MOTION_DURATION_MS).map(([token, ms]) => [token, `${ms}ms`])
  ) as Record<MotionDurationToken, string>,
  ease: {
    emphasized: cssCubicBezier(MOTION_EASE.emphasized.cubicBezier),
    standard: cssCubicBezier(MOTION_EASE.standard.cubicBezier),
    emphasizedAccelerate: cssCubicBezier(MOTION_EASE.emphasizedAccelerate.cubicBezier),
    linear: 'linear'
  } as Record<MotionEaseToken, string>
} as const

/** GSAP-side tokens: durations in seconds + registered CustomEase ids. */
export const motionGsap = {
  duration: MOTION_DURATION_S,
  ease: {
    emphasized: MOTION_EASE.emphasized.gsapName,
    standard: MOTION_EASE.standard.gsapName,
    emphasizedAccelerate: MOTION_EASE.emphasizedAccelerate.gsapName,
    linear: MOTION_EASE.linear.gsapName
  } as Record<MotionEaseToken, string>
} as const
