import { describe, expect, it } from 'vitest'

import { sanitizeSnapshotForPresentation } from '@/lib/finance/client-economics-presentation'

describe('sanitizeSnapshotForPresentation', () => {
  it('hides margins when costs are missing', () => {
    expect(sanitizeSnapshotForPresentation({
      totalRevenueClp: 100000,
      directCostsClp: 0,
      indirectCostsClp: 0,
      grossMarginPercent: 0.9,
      netMarginPercent: 0.9,
      notes: null
    })).toMatchObject({
      hasCompleteCostCoverage: false,
      grossMarginPercent: null,
      netMarginPercent: null
    })
  })

  it('keeps margins when coverage is materially present', () => {
    expect(sanitizeSnapshotForPresentation({
      totalRevenueClp: 100000,
      directCostsClp: 25000,
      indirectCostsClp: 5000,
      grossMarginPercent: 0.7,
      netMarginPercent: 0.65,
      notes: 'monthly materialization'
    })).toMatchObject({
      hasCompleteCostCoverage: true,
      grossMarginPercent: 0.7,
      netMarginPercent: 0.65
    })
  })
})
