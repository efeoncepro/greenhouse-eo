import { describe, expect, it } from 'vitest'

import { checkDiscountHealth } from '../margin-health'

describe('checkDiscountHealth', () => {
  it('marks quotation healthy when margin above target', () => {
    const result = checkDiscountHealth({
      totals: {
        totalCost: 600_000,
        totalPriceBeforeDiscount: 1_000_000,
        totalDiscount: 0,
        totalPrice: 1_000_000,
        effectiveMarginPct: 40
      },
      marginTargetPct: 30,
      marginFloorPct: 20
    })

    expect(result.healthy).toBe(true)
    expect(result.blocking).toBe(false)
    expect(result.requiresApproval).toBe(false)
    expect(result.alerts).toHaveLength(0)
  })

  it('flags blocking when margin is negative', () => {
    const result = checkDiscountHealth({
      totals: {
        totalCost: 1_200_000,
        totalPriceBeforeDiscount: 1_000_000,
        totalDiscount: 0,
        totalPrice: 1_000_000,
        effectiveMarginPct: -20
      },
      marginTargetPct: 30,
      marginFloorPct: 20
    })

    expect(result.blocking).toBe(true)
    expect(result.alerts.some(alert => alert.code === 'margin_below_zero')).toBe(true)
  })

  it('requires finance approval when margin below floor but positive', () => {
    const result = checkDiscountHealth({
      totals: {
        totalCost: 850_000,
        totalPriceBeforeDiscount: 1_000_000,
        totalDiscount: 0,
        totalPrice: 1_000_000,
        effectiveMarginPct: 15
      },
      marginTargetPct: 30,
      marginFloorPct: 20
    })

    expect(result.requiresApproval).toBe(true)
    expect(result.blocking).toBe(true)
    expect(result.alerts.some(alert => alert.code === 'margin_below_floor')).toBe(true)
  })

  it('warns when margin below target but above floor', () => {
    const result = checkDiscountHealth({
      totals: {
        totalCost: 750_000,
        totalPriceBeforeDiscount: 1_000_000,
        totalDiscount: 0,
        totalPrice: 1_000_000,
        effectiveMarginPct: 25
      },
      marginTargetPct: 30,
      marginFloorPct: 20
    })

    expect(result.healthy).toBe(false)
    expect(result.blocking).toBe(false)
    expect(result.requiresApproval).toBe(false)
    expect(result.alerts.some(alert => alert.code === 'margin_below_target')).toBe(true)
  })

  it('flags items with negative margin as warning', () => {
    const result = checkDiscountHealth({
      totals: {
        totalCost: 500_000,
        totalPriceBeforeDiscount: 1_000_000,
        totalDiscount: 0,
        totalPrice: 1_000_000,
        effectiveMarginPct: 50
      },
      marginTargetPct: 30,
      marginFloorPct: 20,
      lineItems: [
        { lineItemId: 'A', subtotalAfterDiscount: 500_000, subtotalCost: 100_000 },
        { lineItemId: 'B', subtotalAfterDiscount: 200_000, subtotalCost: 400_000 }
      ]
    })

    expect(result.blocking).toBe(false)
    expect(result.alerts.some(alert => alert.code === 'item_negative_margin')).toBe(true)
  })

  it('emits info alert when aggregate discount exceeds threshold', () => {
    const result = checkDiscountHealth({
      totals: {
        totalCost: 500_000,
        totalPriceBeforeDiscount: 1_000_000,
        totalDiscount: 300_000,
        totalPrice: 700_000,
        effectiveMarginPct: (700_000 - 500_000) / 700_000 * 100
      },
      marginTargetPct: 20,
      marginFloorPct: 10
    })

    expect(result.alerts.some(alert => alert.code === 'discount_exceeds_threshold')).toBe(true)
  })
})
