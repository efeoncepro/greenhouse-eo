import { describe, expect, it } from 'vitest'

import { classifyRpaMetric } from './rpa-policy'

describe('classifyRpaMetric', () => {
  it('marks RpA as unavailable when there are no completed tasks', () => {
    expect(
      classifyRpaMetric({
        value: null,
        completedTasks: 0,
        eligibleTaskCount: 0,
        missingTaskCount: 0,
        nonPositiveTaskCount: 0
      })
    ).toEqual({
      value: null,
      dataStatus: 'unavailable',
      confidenceLevel: 'none',
      suppressionReason: 'no_completed_tasks',
      evidence: {
        completedTasks: 0,
        eligibleTasks: 0,
        missingTasks: 0,
        nonPositiveTasks: 0
      }
    })
  })

  it('suppresses RpA when completed work has only non-positive evidence', () => {
    expect(
      classifyRpaMetric({
        value: 0,
        completedTasks: 4,
        eligibleTaskCount: 0,
        missingTaskCount: 0,
        nonPositiveTaskCount: 4
      })
    ).toEqual({
      value: null,
      dataStatus: 'suppressed',
      confidenceLevel: 'none',
      suppressionReason: 'non_positive_rpa_values_only',
      evidence: {
        completedTasks: 4,
        eligibleTasks: 0,
        missingTasks: 0,
        nonPositiveTasks: 4
      }
    })
  })

  it('keeps RpA but lowers confidence when coverage is partial', () => {
    expect(
      classifyRpaMetric({
        value: 1.8,
        completedTasks: 5,
        eligibleTaskCount: 3,
        missingTaskCount: 1,
        nonPositiveTaskCount: 1
      })
    ).toEqual({
      value: 1.8,
      dataStatus: 'low_confidence',
      confidenceLevel: 'medium',
      suppressionReason: null,
      evidence: {
        completedTasks: 5,
        eligibleTasks: 3,
        missingTasks: 1,
        nonPositiveTasks: 1
      }
    })
  })

  it('marks RpA as valid when all completed tasks have positive evidence', () => {
    expect(
      classifyRpaMetric({
        value: 1.4,
        completedTasks: 6,
        eligibleTaskCount: 6,
        missingTaskCount: 0,
        nonPositiveTaskCount: 0
      })
    ).toEqual({
      value: 1.4,
      dataStatus: 'valid',
      confidenceLevel: 'high',
      suppressionReason: null,
      evidence: {
        completedTasks: 6,
        eligibleTasks: 6,
        missingTasks: 0,
        nonPositiveTasks: 0
      }
    })
  })
})
