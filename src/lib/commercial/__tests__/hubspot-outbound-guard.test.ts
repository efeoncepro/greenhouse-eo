import { describe, expect, it } from 'vitest'

import {
  HubSpotCostFieldLeakError,
  assertNoCostFieldsInHubSpotPayload,
  sanitizeHubSpotProductPayload
} from '../hubspot-outbound-guard'

describe('sanitizeHubSpotProductPayload', () => {
  it('strips costOfGoodsSold (camelCase)', () => {
    const result = sanitizeHubSpotProductPayload({
      name: 'Creative retainer',
      sku: 'CR-001',
      unitPrice: 9_600_000,
      costOfGoodsSold: 5_000_000
    })

    expect(result).not.toHaveProperty('costOfGoodsSold')
    expect(result).toMatchObject({ name: 'Creative retainer', unitPrice: 9_600_000 })
  })

  it('strips snake_case variants as well', () => {
    const result = sanitizeHubSpotProductPayload({
      name: 'Creative retainer',
      sku: 'CR-001',
      cost_of_goods_sold: 5_000_000,
      unit_cost: 4_800_000
    })

    expect(result).not.toHaveProperty('cost_of_goods_sold')
    expect(result).not.toHaveProperty('unit_cost')
    expect(result).toMatchObject({ name: 'Creative retainer' })
  })

  it('strips margin fields', () => {
    const result = sanitizeHubSpotProductPayload({
      name: 'Creative retainer',
      sku: 'CR-001',
      marginPct: 40,
      targetMarginPct: 35,
      floorMarginPct: 20,
      effectiveMarginPct: 38,
      costBreakdown: { salary: 1_200_000 }
    })

    expect(result).toEqual({ name: 'Creative retainer', sku: 'CR-001' })
  })

  it('preserves pricing-safe fields', () => {
    const result = sanitizeHubSpotProductPayload({
      name: 'Creative retainer',
      sku: 'CR-001',
      description: 'Monthly retainer',
      unitPrice: 9_600_000,
      tax: 0.19,
      isRecurring: true,
      billingFrequency: 'monthly',
      billingPeriodCount: 1
    })

    expect(result).toMatchObject({
      name: 'Creative retainer',
      sku: 'CR-001',
      description: 'Monthly retainer',
      unitPrice: 9_600_000,
      tax: 0.19,
      isRecurring: true,
      billingFrequency: 'monthly',
      billingPeriodCount: 1
    })
  })
})

describe('assertNoCostFieldsInHubSpotPayload', () => {
  it('throws with leaked fields list when cost fields present', () => {
    expect(() =>
      assertNoCostFieldsInHubSpotPayload({
        name: 'Creative retainer',
        costOfGoodsSold: 5_000_000,
        marginPct: 40
      })
    ).toThrow(HubSpotCostFieldLeakError)
  })

  it('does not throw when only safe fields are present', () => {
    expect(() =>
      assertNoCostFieldsInHubSpotPayload({
        name: 'Creative retainer',
        sku: 'CR-001',
        unitPrice: 9_600_000
      })
    ).not.toThrow()
  })

  it('reports every leaked field in the error', () => {
    try {
      assertNoCostFieldsInHubSpotPayload({
        costOfGoodsSold: 1,
        margin_pct: 2,
        costBreakdown: {}
      })
      throw new Error('expected to throw')
    } catch (err) {
      expect(err).toBeInstanceOf(HubSpotCostFieldLeakError)
      expect((err as HubSpotCostFieldLeakError).leakedFields).toEqual(
        expect.arrayContaining(['costOfGoodsSold', 'margin_pct', 'costBreakdown'])
      )
    }
  })
})
