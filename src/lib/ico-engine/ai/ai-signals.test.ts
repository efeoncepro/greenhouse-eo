import { describe, expect, it } from 'vitest'

import { detectAiAnomalies } from '@/lib/ico-engine/ai/anomaly-detector'
import { evaluateAiEligibility } from '@/lib/ico-engine/ai/eligibility'
import { buildAiPredictions } from '@/lib/ico-engine/ai/predictor'

import type { AiMetricSnapshotRow } from '@/lib/ico-engine/ai/types'

const buildSnapshot = ({
  spaceId = 'space-1',
  periodYear,
  periodMonth,
  otdPct,
  completedTasks = 16,
  onTimeCount = 12,
  lateDropCount = 2,
  overdueCount = 2
}: {
  spaceId?: string
  periodYear: number
  periodMonth: number
  otdPct: number
  completedTasks?: number
  onTimeCount?: number
  lateDropCount?: number
  overdueCount?: number
}): AiMetricSnapshotRow => ({
  space_id: spaceId,
  client_id: spaceId,
  period_year: periodYear,
  period_month: periodMonth,
  computed_at: `${periodYear}-${String(periodMonth).padStart(2, '0')}-01T00:00:00.000Z`,
  engine_version: 'v1',
  rpa_avg: null,
  rpa_eligible_task_count: completedTasks,
  rpa_missing_task_count: 0,
  rpa_non_positive_task_count: 0,
  otd_pct: otdPct,
  ftr_pct: null,
  cycle_time_avg_days: null,
  cycle_time_variance: null,
  throughput_count: completedTasks,
  pipeline_velocity: null,
  stuck_asset_count: 0,
  stuck_asset_pct: 0,
  total_tasks: completedTasks,
  completed_tasks: completedTasks,
  active_tasks: Math.max(0, completedTasks - onTimeCount),
  on_time_count: onTimeCount,
  late_drop_count: lateDropCount,
  overdue_count: overdueCount
})

describe('AI ICO signals', () => {
  it('marks a space as AI eligible when rolling completed tasks clears the threshold', () => {
    const result = evaluateAiEligibility([
      buildSnapshot({ periodYear: 2026, periodMonth: 4, otdPct: 90, completedTasks: 16 }),
      buildSnapshot({ periodYear: 2026, periodMonth: 3, otdPct: 91, completedTasks: 12 }),
      buildSnapshot({ periodYear: 2026, periodMonth: 2, otdPct: 92, completedTasks: 10 })
    ])

    expect(result.aiEligible).toBe(true)
    expect(result.completedTasks3m).toBe(38)
    expect(result.reason).toBeNull()
  })

  it('detects a deteriorating OTD anomaly against recent healthy history', () => {
    const currentSnapshot = buildSnapshot({
      periodYear: 2026,
      periodMonth: 4,
      otdPct: 42,
      completedTasks: 18,
      onTimeCount: 7,
      lateDropCount: 4,
      overdueCount: 7
    })

    const historyRows = [
      buildSnapshot({ periodYear: 2026, periodMonth: 3, otdPct: 94 }),
      buildSnapshot({ periodYear: 2026, periodMonth: 2, otdPct: 92 }),
      buildSnapshot({ periodYear: 2026, periodMonth: 1, otdPct: 93 }),
      buildSnapshot({ periodYear: 2025, periodMonth: 12, otdPct: 95 }),
      buildSnapshot({ periodYear: 2025, periodMonth: 11, otdPct: 91 }),
      buildSnapshot({ periodYear: 2025, periodMonth: 10, otdPct: 94 })
    ]

    const signals = detectAiAnomalies({
      currentSnapshots: [currentSnapshot],
      historyBySpace: new Map([[currentSnapshot.space_id, historyRows]]),
      generatedAt: '2026-04-04T12:00:00.000Z',
      modelVersion: 'ico-ai-core-v1'
    })

    expect(signals).toHaveLength(1)
    expect(signals[0]).toMatchObject({
      signalType: 'anomaly',
      metricName: 'otd_pct',
      spaceId: 'space-1',
      severity: 'critical',
      aiEligible: true
    })
    expect(signals[0].expectedValue).toBeGreaterThan(90)
    expect(signals[0].currentValue).toBe(42)
    expect(signals[0].payloadJson.direction).toBe('deterioration')
  })

  it('projects end-of-month OTD only for the active Santiago period', () => {
    const currentSnapshot = buildSnapshot({
      periodYear: 2026,
      periodMonth: 4,
      otdPct: 72,
      completedTasks: 18,
      onTimeCount: 13,
      lateDropCount: 3,
      overdueCount: 2
    })

    const historyRows = [
      buildSnapshot({ periodYear: 2025, periodMonth: 10, otdPct: 80 }),
      buildSnapshot({ periodYear: 2025, periodMonth: 11, otdPct: 79 }),
      buildSnapshot({ periodYear: 2025, periodMonth: 12, otdPct: 78 }),
      buildSnapshot({ periodYear: 2026, periodMonth: 1, otdPct: 77 }),
      buildSnapshot({ periodYear: 2026, periodMonth: 2, otdPct: 76 }),
      buildSnapshot({ periodYear: 2026, periodMonth: 3, otdPct: 75 })
    ]

    const result = buildAiPredictions({
      currentSnapshots: [currentSnapshot],
      historyBySpace: new Map([[currentSnapshot.space_id, historyRows]]),
      generatedAt: '2026-04-04T12:00:00.000Z',
      modelVersion: 'ico-ai-core-v1'
    })

    expect(result.predictionSignals).toHaveLength(1)
    expect(result.predictionLogs).toHaveLength(1)
    expect(result.predictionSignals[0]).toMatchObject({
      signalType: 'prediction',
      metricName: 'otd_pct',
      predictionHorizon: 'end_of_month',
      aiEligible: true
    })
    expect(result.predictionSignals[0].predictedValue).toBeLessThan(72)
    expect(result.predictionSignals[0].confidence).toBeGreaterThan(0)
    expect(result.predictionLogs[0].metricName).toBe('otd_pct')
  })
})
