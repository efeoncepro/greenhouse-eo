import 'server-only'

import type { GoalStatus } from '@/types/hr-goals'

// ── Helpers ──

const MS_PER_DAY = 86_400_000

const daysUntil = (dateStr: string): number => {
  const target = new Date(dateStr)

  if (Number.isNaN(target.getTime())) return Infinity

  const now = new Date()
  const diffMs = target.getTime() - now.getTime()

  return Math.ceil(diffMs / MS_PER_DAY)
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

// ── Progress calculation ──

/**
 * Calculate overall goal progress from its key results.
 *
 * - If no KRs exist or all KRs have null targetValue, returns -1 as a sentinel
 *   indicating the caller should use the latest progress_percent directly.
 * - If KRs with targetValue exist, returns the average of
 *   (currentValue / targetValue * 100) across those KRs, clamped to [0, 100].
 */
export function calculateGoalProgress(
  keyResults: Array<{ targetValue: number | null; currentValue: number }>
): number {
  if (keyResults.length === 0) return -1

  const measurableKRs = keyResults.filter(kr => kr.targetValue !== null && kr.targetValue !== 0)

  if (measurableKRs.length === 0) return -1

  const totalPercent = measurableKRs.reduce((sum, kr) => {
    const ratio = kr.currentValue / (kr.targetValue as number) * 100

    return sum + clamp(ratio, 0, 100)
  }, 0)

  const average = totalPercent / measurableKRs.length

  return Math.round(average * 100) / 100
}

// ── Status derivation ──

/**
 * Derive a goal's status from its progress and the cycle end date.
 *
 * - progress >= 100       -> 'completed'
 * - < 14 days left, < 50% -> 'behind'
 * - < 30 days left, < 70% -> 'at_risk'
 * - otherwise             -> 'on_track'
 */
export function deriveGoalStatus(
  progressPercent: number,
  cycleEndDate: string
): GoalStatus {
  if (progressPercent >= 100) return 'completed'

  const remaining = daysUntil(cycleEndDate)

  if (remaining < 14 && progressPercent < 50) return 'behind'
  if (remaining < 30 && progressPercent < 70) return 'at_risk'

  return 'on_track'
}
