export type RpaDataStatus = 'valid' | 'low_confidence' | 'suppressed' | 'unavailable'
export type RpaConfidenceLevel = 'high' | 'medium' | 'none'
export type RpaSuppressionReason =
  | 'no_completed_tasks'
  | 'missing_rpa_values_only'
  | 'non_positive_rpa_values_only'
  | 'mixed_missing_and_non_positive_rpa_values'

export interface RpaEvidenceCounts {
  completedTasks: number
  eligibleTasks: number
  missingTasks: number
  nonPositiveTasks: number
}

export interface RpaMetricPolicyResult {
  value: number | null
  dataStatus: RpaDataStatus
  confidenceLevel: RpaConfidenceLevel
  suppressionReason: RpaSuppressionReason | null
  evidence: RpaEvidenceCounts
}

const toSafeCount = (value: number | null | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0

const toPositiveValue = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null

export const classifyRpaMetric = (input: {
  value: number | null
  completedTasks: number | null | undefined
  eligibleTaskCount: number | null | undefined
  missingTaskCount: number | null | undefined
  nonPositiveTaskCount: number | null | undefined
}): RpaMetricPolicyResult => {
  const completedTasks = toSafeCount(input.completedTasks)
  const eligibleTasks = Math.min(toSafeCount(input.eligibleTaskCount), completedTasks)
  const missingTasks = Math.min(toSafeCount(input.missingTaskCount), Math.max(0, completedTasks - eligibleTasks))
  const remainingAfterMissing = Math.max(0, completedTasks - eligibleTasks - missingTasks)
  const nonPositiveTasks = Math.min(toSafeCount(input.nonPositiveTaskCount), remainingAfterMissing)
  const sanitizedValue = toPositiveValue(input.value)

  if (completedTasks <= 0) {
    return {
      value: null,
      dataStatus: 'unavailable',
      confidenceLevel: 'none',
      suppressionReason: 'no_completed_tasks',
      evidence: {
        completedTasks,
        eligibleTasks,
        missingTasks,
        nonPositiveTasks
      }
    }
  }

  if (eligibleTasks <= 0 || sanitizedValue === null) {
    const suppressionReason: RpaSuppressionReason =
      missingTasks > 0 && nonPositiveTasks > 0
        ? 'mixed_missing_and_non_positive_rpa_values'
        : missingTasks > 0
          ? 'missing_rpa_values_only'
          : 'non_positive_rpa_values_only'

    return {
      value: null,
      dataStatus: 'suppressed',
      confidenceLevel: 'none',
      suppressionReason,
      evidence: {
        completedTasks,
        eligibleTasks,
        missingTasks,
        nonPositiveTasks
      }
    }
  }

  if (missingTasks > 0 || nonPositiveTasks > 0 || eligibleTasks < completedTasks) {
    return {
      value: sanitizedValue,
      dataStatus: 'low_confidence',
      confidenceLevel: 'medium',
      suppressionReason: null,
      evidence: {
        completedTasks,
        eligibleTasks,
        missingTasks,
        nonPositiveTasks
      }
    }
  }

  return {
    value: sanitizedValue,
    dataStatus: 'valid',
    confidenceLevel: 'high',
    suppressionReason: null,
    evidence: {
      completedTasks,
      eligibleTasks,
      missingTasks,
      nonPositiveTasks
    }
  }
}
