// Circuit breaker for FX provider adapters.
//
// Semantics:
//   - Each provider has an independent state row in the in-memory Map.
//   - 3 consecutive failures within a 5-minute window flips the breaker
//     to OPEN for 15 minutes, during which the orchestrator skips the
//     provider and falls back immediately without an HTTP round-trip.
//   - Any success resets the failure counter.
//   - State is in-memory per process. Vercel serverless reset on cold
//     start is acceptable — the breaker is a runtime safety net, not a
//     durable quarantine. For persistent quarantine, outbox events +
//     operator action via admin endpoint.

import type { FxProviderCode } from './provider-adapter'

const FAILURE_THRESHOLD = 3
const FAILURE_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const OPEN_DURATION_MS = 15 * 60 * 1000 // 15 minutes

interface BreakerState {
  failures: number
  firstFailureAt: number
  openUntil: number
}

const breakers = new Map<FxProviderCode, BreakerState>()

const getOrInit = (code: FxProviderCode): BreakerState => {
  const existing = breakers.get(code)

  if (existing) return existing

  const fresh: BreakerState = { failures: 0, firstFailureAt: 0, openUntil: 0 }

  breakers.set(code, fresh)

  return fresh
}

export const isBreakerOpen = (code: FxProviderCode): boolean => {
  const state = breakers.get(code)

  if (!state) return false

  return Date.now() < state.openUntil
}

export const recordSuccess = (code: FxProviderCode): void => {
  const state = getOrInit(code)

  state.failures = 0
  state.firstFailureAt = 0
  state.openUntil = 0
}

export const recordFailure = (code: FxProviderCode): { opened: boolean; openUntil: number } => {
  const state = getOrInit(code)
  const now = Date.now()

  // Reset counter if the window has elapsed
  if (state.firstFailureAt === 0 || now - state.firstFailureAt > FAILURE_WINDOW_MS) {
    state.failures = 1
    state.firstFailureAt = now
    state.openUntil = 0

    return { opened: false, openUntil: 0 }
  }

  state.failures += 1

  if (state.failures >= FAILURE_THRESHOLD) {
    state.openUntil = now + OPEN_DURATION_MS

    return { opened: true, openUntil: state.openUntil }
  }

  return { opened: false, openUntil: 0 }
}

export const getBreakerSnapshot = (code: FxProviderCode): BreakerState & { isOpen: boolean } => {
  const state = getOrInit(code)

  return { ...state, isOpen: isBreakerOpen(code) }
}

// Testing affordance — not for runtime callers. Resets all breakers.
export const __resetAllBreakers = (): void => {
  breakers.clear()
}
