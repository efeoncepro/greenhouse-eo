import { describe, expect, it } from 'vitest'

import { buildMetricTrustMapFromRow, parseMetricTrustMap } from './metric-trust-policy'

describe('buildMetricTrustMapFromRow', () => {
  it('marks OTD as healthy external trust with high confidence when sample size is sufficient', () => {
    const trust = buildMetricTrustMapFromRow({
      rpa_avg: 1.4,
      rpa_eligible_task_count: 12,
      rpa_missing_task_count: 0,
      rpa_non_positive_task_count: 0,
      otd_pct: 92,
      ftr_pct: 85,
      cycle_time_avg_days: 6,
      cycle_time_variance: 2,
      throughput_count: 18,
      pipeline_velocity: 0.9,
      stuck_asset_count: 1,
      stuck_asset_pct: 5,
      total_tasks: 18,
      completed_tasks: 14,
      active_tasks: 4,
      on_time_count: 11,
      late_drop_count: 1,
      overdue_count: 0
    })

    expect(trust.otd_pct).toMatchObject({
      benchmarkType: 'external',
      qualityGateStatus: 'healthy',
      confidenceLevel: 'high'
    })
    expect(trust.otd_pct.trustEvidence.sampleSize).toBe(12)
  })

  it('marks FTR as degraded analog trust when sample size is too small', () => {
    const trust = buildMetricTrustMapFromRow({
      rpa_avg: 1.8,
      rpa_eligible_task_count: 3,
      rpa_missing_task_count: 0,
      rpa_non_positive_task_count: 0,
      otd_pct: 80,
      ftr_pct: 100,
      cycle_time_avg_days: 8,
      cycle_time_variance: 2,
      throughput_count: 3,
      pipeline_velocity: 0.7,
      stuck_asset_count: 0,
      stuck_asset_pct: 0,
      total_tasks: 4,
      completed_tasks: 3,
      active_tasks: 1,
      on_time_count: 2,
      late_drop_count: 0,
      overdue_count: 1
    })

    expect(trust.ftr_pct).toMatchObject({
      benchmarkType: 'analog',
      qualityGateStatus: 'degraded',
      confidenceLevel: 'medium'
    })
    expect(trust.ftr_pct.qualityGateReasons).toContain('limited_sample_size')
  })

  it('preserves RpA reliability semantics from the existing policy', () => {
    const trust = buildMetricTrustMapFromRow({
      rpa_avg: 2.2,
      rpa_eligible_task_count: 3,
      rpa_missing_task_count: 1,
      rpa_non_positive_task_count: 0,
      otd_pct: 75,
      ftr_pct: 60,
      cycle_time_avg_days: 10,
      cycle_time_variance: 4,
      throughput_count: 4,
      pipeline_velocity: 0.5,
      stuck_asset_count: 1,
      stuck_asset_pct: 25,
      total_tasks: 5,
      completed_tasks: 4,
      active_tasks: 1,
      on_time_count: 2,
      late_drop_count: 1,
      overdue_count: 1
    })

    expect(trust.rpa).toMatchObject({
      benchmarkType: 'adapted',
      qualityGateStatus: 'degraded',
      confidenceLevel: 'medium',
      dataStatus: 'low_confidence'
    })
    expect(trust.rpa.qualityGateReasons).toContain('limited_sample_size')
  })
})

describe('parseMetricTrustMap', () => {
  it('returns an empty object for invalid JSON payloads', () => {
    expect(parseMetricTrustMap('{invalid')).toEqual({})
  })
})
