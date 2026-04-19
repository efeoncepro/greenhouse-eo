import { describe, expect, it } from 'vitest'

import {
  getBlockingConstraintIssues,
  validateCommercialModelMultiplier,
  validateCostComponents,
  validateCountryPricingFactor,
  validateFteHoursGuide,
  validateRoleTierMargin,
  validateToolCatalog
} from '@/lib/commercial/pricing-catalog-constraints'

describe('pricing-catalog-constraints', () => {
  it('blocks invalid monotonic role tier margins', () => {
    const issues = validateRoleTierMargin({
      marginMin: 0.3,
      marginOpt: 0.2,
      marginMax: 0.4
    })

    expect(getBlockingConstraintIssues(issues)).toHaveLength(1)
  })

  it('blocks invalid country pricing factor ordering', () => {
    const issues = validateCountryPricingFactor({
      factorMin: 1.2,
      factorOpt: 1.1,
      factorMax: 1.3
    })

    expect(getBlockingConstraintIssues(issues)).toHaveLength(1)
  })

  it('blocks impossible commercial model multipliers', () => {
    const issues = validateCommercialModelMultiplier({ multiplierPct: 200 })

    expect(getBlockingConstraintIssues(issues)).toHaveLength(1)
  })

  it('blocks invalid cost component hours', () => {
    const issues = validateCostComponents({
      baseSalaryUsd: 1000,
      hoursPerFteMonth: 40
    })

    expect(getBlockingConstraintIssues(issues)).toHaveLength(1)
  })

  it('blocks invalid tool subscription amounts', () => {
    const issues = validateToolCatalog({
      costModel: 'subscription',
      subscriptionAmount: -10
    })

    expect(getBlockingConstraintIssues(issues).length).toBeGreaterThan(0)
  })

  it('blocks invalid fte hours guide rows', () => {
    const issues = validateFteHoursGuide({
      fteFraction: 0,
      hoursPerMonth: 250
    })

    expect(getBlockingConstraintIssues(issues)).toHaveLength(2)
  })
})
