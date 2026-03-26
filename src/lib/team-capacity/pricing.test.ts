import { describe, expect, it } from 'vitest'

import { getBasePricingPolicy, getLoadedCostPerHour, getSuggestedBillRate } from '@/lib/team-capacity/pricing'

describe('team-capacity/pricing', () => {
  it('builds loaded cost from labor and overhead', () => {
    expect(getLoadedCostPerHour({ laborCostPerHourTarget: 1000, overheadPerHourTarget: 250 })).toBe(1250)
  })

  it('computes suggested bill rate from margin policy', () => {
    const snapshot = getSuggestedBillRate({
      loadedCostPerHourTarget: 1000,
      pricingPolicy: { targetMarginPct: 0.4 },
      targetCurrency: 'CLP'
    })

    expect(snapshot.suggestedBillRateTarget).toBe(1666.67)
    expect(snapshot.policyType).toBe('margin')
  })

  it('applies minimum floor when configured', () => {
    const snapshot = getSuggestedBillRate({
      loadedCostPerHourTarget: 1000,
      pricingPolicy: { markupMultiplier: 1.1, minimumBillRateTarget: 1500 },
      targetCurrency: 'CLP'
    })

    expect(snapshot.suggestedBillRateTarget).toBe(1500)
    expect(snapshot.policyType).toBe('minimum_floor')
  })

  it('exposes the base pricing policy as a target-margin baseline', () => {
    expect(getBasePricingPolicy({ roleCategory: 'development', targetCurrency: 'CLP' })).toEqual({
      targetMarginPct: 0.35,
      minimumBillRateTarget: null
    })
  })
})
