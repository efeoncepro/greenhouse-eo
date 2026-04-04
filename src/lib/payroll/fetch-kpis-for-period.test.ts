import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  ensureIcoEngineInfrastructure,
  readMemberMetricsBatch,
  computeMetricsByContext
} = vi.hoisted(() => ({
  ensureIcoEngineInfrastructure: vi.fn(),
  readMemberMetricsBatch: vi.fn(),
  computeMetricsByContext: vi.fn()
}))

vi.mock('@/lib/ico-engine/schema', () => ({
  ensureIcoEngineInfrastructure
}))

vi.mock('@/lib/ico-engine/read-metrics', () => ({
  readMemberMetricsBatch,
  computeMetricsByContext
}))

import { fetchKpisForPeriod } from './fetch-kpis-for-period'

const buildIcoSnapshot = ({
  memberId,
  rpa,
  otd,
  completedTasks,
  source,
  rpaDataStatus = rpa == null ? 'unavailable' : 'valid',
  rpaConfidenceLevel = rpa == null ? 'none' : 'high',
  rpaSuppressionReason = rpa == null ? 'no_completed_tasks' : null,
  rpaEvidence = {
    completedTasks,
    eligibleTasks: rpa == null ? 0 : completedTasks,
    missingTasks: 0,
    nonPositiveTasks: 0
  }
}: {
  memberId: string
  rpa: number | null
  otd: number | null
  completedTasks: number
  source: 'materialized' | 'live'
  rpaDataStatus?: 'valid' | 'low_confidence' | 'suppressed' | 'unavailable'
  rpaConfidenceLevel?: 'high' | 'medium' | 'none'
  rpaSuppressionReason?: string | null
  rpaEvidence?: {
    completedTasks: number
    eligibleTasks: number
    missingTasks: number
    nonPositiveTasks: number
  }
}) => ({
  dimension: 'member' as const,
  dimensionValue: memberId,
  dimensionLabel: null,
  periodYear: 2026,
  periodMonth: 3,
  metrics: [
    {
      metricId: 'rpa',
      value: rpa,
      zone: null,
      dataStatus: rpaDataStatus,
      confidenceLevel: rpaConfidenceLevel,
      suppressionReason: rpaSuppressionReason,
      evidence: rpaEvidence
    },
    { metricId: 'otd_pct', value: otd, zone: null }
  ],
  cscDistribution: [],
  context: {
    totalTasks: completedTasks,
    completedTasks,
    activeTasks: 0
  },
  computedAt: '2026-03-31T23:59:59.000Z',
  engineVersion: 'test',
  source
})

describe('fetchKpisForPeriod', () => {
  beforeEach(() => {
    ensureIcoEngineInfrastructure.mockReset()
    readMemberMetricsBatch.mockReset()
    computeMetricsByContext.mockReset()
  })

  it('uses materialized ICO metrics first and fills gaps with live compute', async () => {
    readMemberMetricsBatch.mockResolvedValue(
      new Map([
        [
          'member-1',
          buildIcoSnapshot({
            memberId: 'member-1',
            rpa: 1.4,
            otd: 96,
            completedTasks: 12,
            source: 'materialized'
          })
        ]
      ])
    )

    computeMetricsByContext.mockImplementation(async (_dimension, memberId) =>
      memberId === 'member-2'
        ? buildIcoSnapshot({
            memberId: 'member-2',
            rpa: 2.1,
            otd: 88,
            completedTasks: 7,
            source: 'live'
          })
        : null
    )

    const result = await fetchKpisForPeriod({
      memberIds: ['member-1', 'member-2'],
      periodYear: 2026,
      periodMonth: 3
    })

    expect(ensureIcoEngineInfrastructure).toHaveBeenCalledTimes(1)
    expect(readMemberMetricsBatch).toHaveBeenCalledWith(['member-1', 'member-2'], 2026, 3)
    expect(computeMetricsByContext).toHaveBeenCalledWith('member', 'member-2', 2026, 3)

    expect(result.snapshots.get('member-1')).toEqual({
      memberId: 'member-1',
      otdPercent: 96,
      rpaAvg: 1.4,
      rpaDataStatus: 'valid',
      rpaConfidenceLevel: 'high',
      rpaSuppressionReason: null,
      rpaEvidence: {
        completedTasks: 12,
        eligibleTasks: 12,
        missingTasks: 0,
        nonPositiveTasks: 0
      },
      tasksCompleted: 12,
      dataSource: 'ico',
      sourceMode: 'materialized'
    })

    expect(result.snapshots.get('member-2')).toEqual({
      memberId: 'member-2',
      otdPercent: 88,
      rpaAvg: 2.1,
      rpaDataStatus: 'valid',
      rpaConfidenceLevel: 'high',
      rpaSuppressionReason: null,
      rpaEvidence: {
        completedTasks: 7,
        eligibleTasks: 7,
        missingTasks: 0,
        nonPositiveTasks: 0
      },
      tasksCompleted: 7,
      dataSource: 'ico',
      sourceMode: 'live'
    })

    expect(result.diagnostics).toEqual({
      source: 'ico',
      strategy: 'materialized_first_with_live_fallback',
      periodYear: 2026,
      periodMonth: 3,
      materializedMembers: 1,
      liveComputedMembers: 1,
      missingMembers: 0
    })
  })

  it('tracks members with no ICO metrics even after live fallback', async () => {
    readMemberMetricsBatch.mockResolvedValue(new Map())
    computeMetricsByContext.mockResolvedValue(null)

    const result = await fetchKpisForPeriod({
      memberIds: ['member-3'],
      periodYear: 2026,
      periodMonth: 3
    })

    expect(result.snapshots.size).toBe(0)
    expect(result.diagnostics.missingMembers).toBe(1)
    expect(result.diagnostics.liveComputedMembers).toBe(0)
  })

  it('ignores null and blank member ids instead of failing the whole batch', async () => {
    readMemberMetricsBatch.mockResolvedValue(
      new Map([
        [
          'member-1',
          buildIcoSnapshot({
            memberId: 'member-1',
            rpa: 1.7,
            otd: 91,
            completedTasks: 9,
            source: 'materialized'
          })
        ]
      ])
    )

    const result = await fetchKpisForPeriod({
      memberIds: ['member-1', null, undefined, '   '],
      periodYear: 2026,
      periodMonth: 3
    })

    expect(readMemberMetricsBatch).toHaveBeenCalledWith(['member-1'], 2026, 3)
    expect(result.snapshots.get('member-1')?.otdPercent).toBe(91)
    expect(result.snapshots.get('member-1')?.rpaDataStatus).toBe('valid')
    expect(result.diagnostics.materializedMembers).toBe(1)
    expect(result.diagnostics.missingMembers).toBe(0)
  })

  it('propagates suppressed RpA as null instead of rewarding an ambiguous zero', async () => {
    readMemberMetricsBatch.mockResolvedValue(
      new Map([
        [
          'member-4',
          buildIcoSnapshot({
            memberId: 'member-4',
            rpa: null,
            otd: 93,
            completedTasks: 4,
            source: 'materialized',
            rpaDataStatus: 'suppressed',
            rpaConfidenceLevel: 'none',
            rpaSuppressionReason: 'non_positive_rpa_values_only',
            rpaEvidence: {
              completedTasks: 4,
              eligibleTasks: 0,
              missingTasks: 0,
              nonPositiveTasks: 4
            }
          })
        ]
      ])
    )

    const result = await fetchKpisForPeriod({
      memberIds: ['member-4'],
      periodYear: 2026,
      periodMonth: 3
    })

    expect(result.snapshots.get('member-4')).toEqual({
      memberId: 'member-4',
      otdPercent: 93,
      rpaAvg: null,
      rpaDataStatus: 'suppressed',
      rpaConfidenceLevel: 'none',
      rpaSuppressionReason: 'non_positive_rpa_values_only',
      rpaEvidence: {
        completedTasks: 4,
        eligibleTasks: 0,
        missingTasks: 0,
        nonPositiveTasks: 4
      },
      tasksCompleted: 4,
      dataSource: 'ico',
      sourceMode: 'materialized'
    })
  })
})
