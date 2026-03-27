import { describe, expect, it } from 'vitest'

import {
  buildLaborEconomicsSnapshot,
  getCostPerHour,
  getTotalCompensationSource,
  type CompensationBreakdown,
  type FxContext
} from '@/lib/team-capacity/economics'

describe('team-capacity/economics', () => {
  const compensation: CompensationBreakdown = {
    sourceCurrency: 'USD',
    baseSalarySource: 1000,
    fixedBonusesSource: 100,
    variableBonusesSource: 50,
    employerCostsSource: 25
  }

  const fx: FxContext = {
    sourceCurrency: 'USD',
    targetCurrency: 'CLP',
    rate: 900,
    rateDate: '2026-03-31',
    provider: 'mindicador',
    strategy: 'period_last_business_day'
  }

  it('adds compensation components in source currency', () => {
    expect(getTotalCompensationSource(compensation)).toBe(1175)
  })

  it('builds a complete converted labor snapshot', () => {
    const snapshot = buildLaborEconomicsSnapshot({
      compensation,
      contractedHours: 160,
      targetCurrency: 'CLP',
      fx
    })

    expect(snapshot.totalLaborCostTarget).toBe(1057500)
    expect(snapshot.costPerHourTarget).toBe(6609.38)
    expect(snapshot.snapshotStatus).toBe('complete')
  })

  it('marks missing fx when currencies differ and fx is absent', () => {
    const snapshot = buildLaborEconomicsSnapshot({
      compensation,
      contractedHours: 160,
      targetCurrency: 'CLP'
    })

    expect(snapshot.totalLaborCostTarget).toBeNull()
    expect(snapshot.costPerHourTarget).toBeNull()
    expect(snapshot.snapshotStatus).toBe('missing_fx')
  })

  it('returns null cost per hour for invalid capacity', () => {
    expect(getCostPerHour({ totalLaborCostTarget: 1000, contractedHours: 0 })).toBeNull()
  })
})
