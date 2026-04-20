import 'server-only'

/**
 * Pure domain helper for computing the signed delta between a system-suggested
 * unit cost and a manual override. Used by the Quote Builder override UI (live
 * preview) and by the write path (persistence + event payload).
 *
 * Contract (TASK-481):
 *   - Inputs must be finite, non-negative numbers in the same currency (USD).
 *   - suggestedUnitCost may be zero (fallback cases) — deltaPct becomes null.
 *   - deltaPct is returned as a signed percentage rounded to 4 decimals.
 *   - direction indicates whether the override is above / below / equal to the
 *     suggested value.
 */

export type OverrideDeltaDirection = 'above' | 'below' | 'equal'

export interface OverrideDeltaInput {
  suggestedUnitCost: number | null | undefined
  overrideUnitCost: number | null | undefined
}

export interface OverrideDeltaResult {
  deltaAbsolute: number | null
  deltaPct: number | null
  direction: OverrideDeltaDirection | null
  hasSuggestedBaseline: boolean
}

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

const isFiniteNonNegative = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

export const computeOverrideDelta = (input: OverrideDeltaInput): OverrideDeltaResult => {
  const suggested = input.suggestedUnitCost
  const override = input.overrideUnitCost

  if (!isFiniteNonNegative(override)) {
    return {
      deltaAbsolute: null,
      deltaPct: null,
      direction: null,
      hasSuggestedBaseline: isFiniteNonNegative(suggested)
    }
  }

  if (!isFiniteNonNegative(suggested)) {
    return {
      deltaAbsolute: null,
      deltaPct: null,
      direction: null,
      hasSuggestedBaseline: false
    }
  }

  const deltaAbsolute = round(override - suggested, 4)
  const deltaPct = suggested === 0 ? null : round(((override - suggested) / suggested) * 100, 4)

  let direction: OverrideDeltaDirection
  if (deltaAbsolute > 0) {
    direction = 'above'
  } else if (deltaAbsolute < 0) {
    direction = 'below'
  } else {
    direction = 'equal'
  }

  return {
    deltaAbsolute,
    deltaPct,
    direction,
    hasSuggestedBaseline: true
  }
}
