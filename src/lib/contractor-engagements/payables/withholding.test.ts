import { describe, expect, it } from 'vitest'

import { computeContractorWithholding } from './withholding'

describe('contractor payable withholding (TASK-793)', () => {
  it('withholds for honorarios_cl under greenhouse_policy with a rate snapshot', () => {
    expect(
      computeContractorWithholding({
        relationshipSubtype: 'honorarios_cl',
        taxComplianceOwner: 'greenhouse_policy',
        taxWithholdingRateSnapshot: 0.1525,
        grossAmount: 1000
      })
    ).toBe(152.5)
  })

  it('rounds withholding to 2 decimals', () => {
    expect(
      computeContractorWithholding({
        relationshipSubtype: 'honorarios_cl',
        taxComplianceOwner: 'greenhouse_policy',
        taxWithholdingRateSnapshot: 0.1525,
        grossAmount: 1234.56
      })
    ).toBe(188.27)
  })

  it('withholds 0 for international/provider lanes (provider handles local tax)', () => {
    expect(
      computeContractorWithholding({
        relationshipSubtype: 'international_contractor',
        taxComplianceOwner: 'provider_owned',
        taxWithholdingRateSnapshot: null,
        grossAmount: 1000
      })
    ).toBe(0)
  })

  it('withholds 0 when subtype is honorarios_cl but owner is not greenhouse_policy', () => {
    expect(
      computeContractorWithholding({
        relationshipSubtype: 'honorarios_cl',
        taxComplianceOwner: 'manual_review_required',
        taxWithholdingRateSnapshot: 0.1525,
        grossAmount: 1000
      })
    ).toBe(0)
  })

  it('withholds 0 when rate snapshot is null or zero', () => {
    expect(
      computeContractorWithholding({
        relationshipSubtype: 'honorarios_cl',
        taxComplianceOwner: 'greenhouse_policy',
        taxWithholdingRateSnapshot: null,
        grossAmount: 1000
      })
    ).toBe(0)
    expect(
      computeContractorWithholding({
        relationshipSubtype: 'honorarios_cl',
        taxComplianceOwner: 'greenhouse_policy',
        taxWithholdingRateSnapshot: 0,
        grossAmount: 1000
      })
    ).toBe(0)
  })
})
