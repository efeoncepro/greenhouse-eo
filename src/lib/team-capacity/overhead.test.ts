import { describe, expect, it } from 'vitest'

import {
  allocateSharedOverheadTarget,
  buildMemberOverheadSnapshot,
  getDirectOverheadTarget,
  type DirectMemberOverhead,
  type SharedOverheadPool
} from '@/lib/team-capacity/overhead'

describe('team-capacity/overhead', () => {
  it('converts direct overhead to target currency', () => {
    const direct: DirectMemberOverhead = {
      memberId: 'm1',
      periodYear: 2026,
      periodMonth: 3,
      sourceCurrency: 'USD',
      licenseCostSource: 10,
      toolingCostSource: 20,
      equipmentCostSource: 5
    }

    const value = getDirectOverheadTarget({
      direct,
      targetCurrency: 'CLP',
      fx: {
        sourceCurrency: 'USD',
        targetCurrency: 'CLP',
        rate: 900,
        rateDate: '2026-03-31',
        provider: 'mindicador',
        strategy: 'period_last_business_day'
      }
    })

    expect(value).toBe(31500)
  })

  it('allocates shared overhead proportionally', () => {
    const pool: SharedOverheadPool = {
      periodYear: 2026,
      periodMonth: 3,
      targetCurrency: 'CLP',
      totalSharedOverheadTarget: 160000,
      allocationMethod: 'contracted_hours'
    }

    expect(allocateSharedOverheadTarget({ pool, memberWeight: 80, totalWeight: 160 })).toBe(80000)
  })

  it('builds total overhead per hour', () => {
    const snapshot = buildMemberOverheadSnapshot({
      directOverheadTarget: 10000,
      sharedOverheadTarget: 20000,
      contractedHours: 160
    })

    expect(snapshot.totalOverheadTarget).toBe(30000)
    expect(snapshot.overheadPerHourTarget).toBe(187.5)
    expect(snapshot.snapshotStatus).toBe('complete')
  })
})
