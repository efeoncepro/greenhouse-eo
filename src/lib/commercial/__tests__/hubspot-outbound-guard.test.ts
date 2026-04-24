import { describe, expect, it } from 'vitest'

import {
  HubSpotCostFieldLeakError,
  assertNoCostFieldsInHubSpotPayload,
  sanitizeHubSpotProductPayload
} from '../hubspot-outbound-guard'

describe('sanitizeHubSpotProductPayload', () => {
  it('PRESERVES costOfGoodsSold (TASK-603 unblocked COGS outbound)', () => {
    const result = sanitizeHubSpotProductPayload({
      name: 'Creative retainer',
      sku: 'CR-001',
      unitPrice: 9_600_000,
      costOfGoodsSold: 5_000_000
    })

    expect(result).toMatchObject({
      name: 'Creative retainer',
      unitPrice: 9_600_000,
      costOfGoodsSold: 5_000_000
    })
  })

  it('PRESERVES snake_case cost_of_goods_sold (TASK-603)', () => {
    const result = sanitizeHubSpotProductPayload({
      name: 'Creative retainer',
      sku: 'CR-001',
      cost_of_goods_sold: 5_000_000
    })

    expect(result).toMatchObject({
      name: 'Creative retainer',
      cost_of_goods_sold: 5_000_000
    })
  })

  it('strips margin fields (both camelCase and snake_case)', () => {
    const result = sanitizeHubSpotProductPayload({
      name: 'Creative retainer',
      sku: 'CR-001',
      marginPct: 40,
      margin_pct: 40,
      targetMarginPct: 35,
      target_margin_pct: 35,
      floorMarginPct: 20,
      floor_margin_pct: 20,
      effectiveMarginPct: 38,
      effective_margin_pct: 38,
      costBreakdown: { salary: 1_200_000 },
      cost_breakdown: { salary: 1_200_000 }
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
  it('throws with leaked fields list when margin fields present', () => {
    expect(() =>
      assertNoCostFieldsInHubSpotPayload({
        name: 'Creative retainer',
        marginPct: 40,
        targetMarginPct: 35
      })
    ).toThrow(HubSpotCostFieldLeakError)
  })

  it('does NOT throw when costOfGoodsSold is present (TASK-603 unblocked)', () => {
    expect(() =>
      assertNoCostFieldsInHubSpotPayload({
        name: 'Creative retainer',
        sku: 'CR-001',
        unitPrice: 9_600_000,
        costOfGoodsSold: 5_000_000
      })
    ).not.toThrow()
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

  it('reports every leaked margin/cost_breakdown field in the error', () => {
    try {
      assertNoCostFieldsInHubSpotPayload({
        marginPct: 1,
        margin_pct: 2,
        costBreakdown: {},
        cost_breakdown: {}
      })
      throw new Error('expected to throw')
    } catch (err) {
      expect(err).toBeInstanceOf(HubSpotCostFieldLeakError)
      expect((err as HubSpotCostFieldLeakError).leakedFields).toEqual(
        expect.arrayContaining(['marginPct', 'margin_pct', 'costBreakdown', 'cost_breakdown'])
      )
    }
  })
})
