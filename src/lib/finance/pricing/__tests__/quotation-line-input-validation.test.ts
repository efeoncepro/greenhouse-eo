import { describe, expect, it } from 'vitest'

import { ensureQuotationLineInputsArePriced } from '../quotation-line-input-validation'

describe('ensureQuotationLineInputsArePriced', () => {
  it('allows manual direct-cost lines with explicit zero', () => {
    expect(() =>
      ensureQuotationLineInputsArePriced([
        {
          lineType: 'direct_cost',
          label: 'Cortesía comercial',
          quantity: 1,
          unitPrice: 0
        }
      ])
    ).not.toThrow()
  })

  it('rejects role-backed lines without a persisted unit price', () => {
    expect(() =>
      ensureQuotationLineInputsArePriced([
        {
          lineType: 'role',
          label: 'PR Analyst',
          quantity: 1,
          unitPrice: 0,
          roleCode: 'ECG-004'
        }
      ])
    ).toThrow(/no tienen precio calculado/i)
  })

  it('rejects metadata-backed auto-priced lines without a persisted unit price', () => {
    expect(() =>
      ensureQuotationLineInputsArePriced([
        {
          lineType: 'direct_cost',
          label: 'Figma',
          quantity: 1,
          unitPrice: 0,
          metadata: {
            pricingV2LineType: 'tool',
            sku: 'TOOL-FIGMA'
          }
        }
      ])
    ).toThrow(/no tienen precio calculado/i)
  })
})
