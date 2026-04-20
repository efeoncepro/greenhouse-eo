import { beforeAll, describe, expect, it } from 'vitest'

import {
  loadPricingGovernanceSeedFiles,
  normalizePricingGovernanceSeedData
} from '@/lib/commercial/pricing-governance-seed'

describe('normalizePricingGovernanceSeedData', () => {
  let seedFiles: Awaited<ReturnType<typeof loadPricingGovernanceSeedFiles>>

  beforeAll(async () => {
    seedFiles = await loadPricingGovernanceSeedFiles()
  })

  it('parses the real governance seed set into canonical rows', () => {
    const result = normalizePricingGovernanceSeedData(seedFiles)

    expect(result.roleTierMargins).toHaveLength(4)
    expect(result.serviceTierMargins).toHaveLength(4)
    expect(result.commercialModelMultipliers).toHaveLength(4)
    expect(result.countryPricingFactors).toHaveLength(6)
    expect(result.fteHoursGuide).toHaveLength(11)
    expect(result.summary.skippedControlRows).toBe(5)
    expect(result.rejectedRows).toHaveLength(0)
    expect(result.needsReviewRows).toHaveLength(0)
  })

  it('keeps tier 4 and range-derived factors aligned with the real CSV', () => {
    const result = normalizePricingGovernanceSeedData(seedFiles)
    const tier4 = result.roleTierMargins.find(row => row.tier === '4')
    const colombia = result.countryPricingFactors.find(row => row.factorCode === 'colombia_latam')
    const international = result.countryPricingFactors.find(row => row.factorCode === 'international_usd')

    expect(tier4).toMatchObject({
      marginMin: 0.6,
      marginOpt: 0.7,
      marginMax: 0.8
    })

    expect(colombia?.factorMin).toBeCloseTo(0.85, 6)
    expect(colombia?.factorOpt).toBeCloseTo(0.875, 6)
    expect(colombia?.factorMax).toBeCloseTo(0.9, 6)

    expect(international?.factorMin).toBeCloseTo(1.1, 6)
    expect(international?.factorOpt).toBeCloseTo(1.15, 6)
    expect(international?.factorMax).toBeCloseTo(1.2, 6)
  })

  it('reports drift when the catalog disagrees with the governance CSV', () => {
    const result = normalizePricingGovernanceSeedData(seedFiles, {
      catalogRoles: [
        { roleLabelEs: 'Copywriter', tier: '2' },
        { roleLabelEs: 'Content Manager', tier: '3' },
        { roleLabelEs: 'Desarrollador Full Stack Junior', tier: '2' },
        { roleLabelEs: 'Desarrollador Full Stack Mid', tier: '2' }
      ]
    })

    expect(result.driftRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceRoleLabel: 'Content Manager',
          canonicalRoleLabel: 'Content Manager',
          sourceTier: '2',
          catalogTier: '3',
          status: 'tier_mismatch'
        })
      ])
    )
  })
})
