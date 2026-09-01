import { describe, expect, it } from 'vitest'

import type { GcpCostDriver } from '@/types/billing-export'

import { buildCloudCostAlertIncident } from './finops-alert-fingerprint'

const driver = (overrides: Partial<GcpCostDriver> = {}): GcpCostDriver => ({
  driverId: 'share_of_total.cloud_run',
  kind: 'share_of_total',
  severity: 'warning',
  serviceDescription: 'Cloud Run',
  resourceName: 'globe-producer-worker',
  summary: 'Cloud Run concentra el gasto.',
  currentCost: 100_000,
  baselineCost: 200_000,
  deltaPercent: 120,
  share: 55,
  threshold: '>=50%',
  evidence: [],
  ...overrides
})

describe('buildCloudCostAlertIncident', () => {
  it('keeps one incident stable while mutable billing amounts change', () => {
    const before = buildCloudCostAlertIncident({ severity: 'warning', drivers: [driver()] })

    const after = buildCloudCostAlertIncident({
      severity: 'warning',
      drivers: [driver({ currentCost: 140_000, baselineCost: 210_000, deltaPercent: 160, share: 61 })]
    })

    expect(after).toEqual(before)
  })

  it('changes identity when severity or the driver set changes', () => {
    const warning = buildCloudCostAlertIncident({ severity: 'warning', drivers: [driver()] })
    const error = buildCloudCostAlertIncident({ severity: 'error', drivers: [driver({ severity: 'error' })] })

    const additionalDriver = buildCloudCostAlertIncident({
      severity: 'warning',
      drivers: [driver(), driver({ driverId: 'forecast.month_end_cost', kind: 'forecast_risk' })]
    })

    expect(error).not.toEqual(warning)
    expect(additionalDriver).not.toEqual(warning)
  })

  it('sorts drivers so query ordering cannot bypass cooldown', () => {
    const a = driver({ driverId: 'a' })
    const b = driver({ driverId: 'b' })

    expect(buildCloudCostAlertIncident({ severity: 'warning', drivers: [a, b] })).toEqual(
      buildCloudCostAlertIncident({ severity: 'warning', drivers: [b, a] })
    )
  })
})
