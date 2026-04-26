/**
 * TASK-525 — View Transitions API canonical helper.
 *
 * Wraps `document.startViewTransition(...)` with feature detection + reduced
 * motion gating. Use this everywhere the portal triggers a same-document
 * route change that should morph instead of cut.
 *
 * Browser support: Chrome 111+, Safari 18+, Edge 111+. Firefox not yet —
 * falls back to running the update synchronously (instant navigation).
 *
 * The browser already honors `prefers-reduced-motion: reduce` for declared
 * keyframes in `::view-transition-*`. We additionally short-circuit here so
 * that callers with very long-running update functions don't pay even the
 * snapshot cost when motion is disabled.
 */

type UpdateFn = () => void | Promise<void>

type StartViewTransition = (update: UpdateFn) => { finished: Promise<void> }

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const isViewTransitionsSupported = (): boolean => {
  if (typeof document === 'undefined') return false

  return typeof (document as unknown as { startViewTransition?: StartViewTransition }).startViewTransition === 'function'
}

export const startViewTransition = async (update: UpdateFn): Promise<void> => {
  // SSR / jsdom / unsupported browsers / reduced motion → run update directly.
  if (!isViewTransitionsSupported() || prefersReducedMotion()) {
    await update()

    return
  }

  const transition = (document as unknown as { startViewTransition: StartViewTransition }).startViewTransition(update)

  // We only await `finished` so callers that need to chain logic after the
  // animation completes can `await startViewTransition(...)`. Errors inside
  // `update` propagate via the `finished` promise.
  await transition.finished.catch(() => undefined)
}

export const supportsViewTransitions = isViewTransitionsSupported
