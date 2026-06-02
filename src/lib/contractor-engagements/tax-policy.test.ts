import { describe, expect, it } from 'vitest'

import { resolveDefaultTaxComplianceOwner, resolveHonorariosWithholdingPolicy } from './tax-policy'

describe('contractor tax/compliance policy', () => {
  it('honorarios_cl defaults to greenhouse_policy', () => {
    expect(
      resolveDefaultTaxComplianceOwner({
        relationshipSubtype: 'honorarios_cl',
        payrollVia: 'internal'
      })
    ).toBe('greenhouse_policy')
  })

  it('provider lanes default to provider_owned', () => {
    for (const payrollVia of ['deel', 'remote', 'oyster'] as const) {
      expect(
        resolveDefaultTaxComplianceOwner({
          relationshipSubtype: 'international_contractor',
          payrollVia
        })
      ).toBe('provider_owned')
    }
  })

  it('direct_international and manual_provider default to manual_review_required', () => {
    expect(
      resolveDefaultTaxComplianceOwner({
        relationshipSubtype: 'international_contractor',
        payrollVia: 'direct_international'
      })
    ).toBe('manual_review_required')
    expect(
      resolveDefaultTaxComplianceOwner({
        relationshipSubtype: 'freelance',
        payrollVia: 'manual_provider'
      })
    ).toBe('manual_review_required')
  })

  it('snapshots the SII honorarios rate + a versioned policy code (2026 = 15.25%)', () => {
    const policy = resolveHonorariosWithholdingPolicy(2026)

    expect(policy.rateSnapshot).toBeCloseTo(0.1525, 5)
    expect(policy.policyCode).toBe('cl_honorarios_2026_15_25')
  })

  it('versions the policy code per emission year', () => {
    expect(resolveHonorariosWithholdingPolicy(2025).policyCode).toBe('cl_honorarios_2025_14_50')
    expect(resolveHonorariosWithholdingPolicy(2027).policyCode).toBe('cl_honorarios_2027_16_00')
  })
})
