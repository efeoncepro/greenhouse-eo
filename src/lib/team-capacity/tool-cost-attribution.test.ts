import { describe, expect, it } from 'vitest'

import { computeDirectOverheadForMember } from '@/lib/team-capacity/tool-cost-attribution'

describe('team-capacity/tool-cost-attribution', () => {
  it('computes monthly direct overhead from subscription licenses and tooling credits', () => {
    const result = computeDirectOverheadForMember({
      memberId: 'member-1',
      periodYear: 2026,
      periodMonth: 3,
      targetCurrency: 'CLP',
      licenses: [
        {
          toolId: 'claude-team',
          costModel: 'subscription',
          subscriptionAmount: 60,
          subscriptionCurrency: 'USD',
          subscriptionBillingCycle: 'monthly',
          subscriptionSeats: 3
        }
      ],
      toolingCostTarget: 12500,
      fxByCurrency: {
        USD: 900
      }
    })

    expect(result.breakdown.licenseCostTarget).toBe(18000)
    expect(result.breakdown.toolingCostTarget).toBe(12500)
    expect(result.direct.licenseCostSource).toBe(18000)
    expect(result.direct.toolingCostSource).toBe(12500)
    expect(result.snapshotStatus).toBe('complete')
  })

  it('returns partial when a foreign-currency license has no FX', () => {
    const result = computeDirectOverheadForMember({
      memberId: 'member-1',
      periodYear: 2026,
      periodMonth: 3,
      targetCurrency: 'CLP',
      licenses: [
        {
          toolId: 'claude-team',
          costModel: 'subscription',
          subscriptionAmount: 60,
          subscriptionCurrency: 'USD',
          subscriptionBillingCycle: 'monthly',
          subscriptionSeats: 3
        }
      ],
      toolingCostTarget: 0
    })

    expect(result.breakdown.licenseCostTarget).toBe(0)
    expect(result.snapshotStatus).toBe('partial')
  })

  it('treats the absence of direct tooling as a valid zero-cost snapshot', () => {
    const result = computeDirectOverheadForMember({
      memberId: 'member-1',
      periodYear: 2026,
      periodMonth: 3,
      targetCurrency: 'CLP',
      licenses: [],
      toolingCostTarget: 0
    })

    expect(result.direct.licenseCostSource).toBe(0)
    expect(result.direct.toolingCostSource).toBe(0)
    expect(result.snapshotStatus).toBe('complete')
  })
})
