import { describe, expect, it } from 'vitest'

import { aggregateQuotationTotals, computeLineItemTotals } from '../line-item-totals'

describe('computeLineItemTotals', () => {
  it('computes straight subtotal with no discount and no cost', () => {
    const result = computeLineItemTotals({
      lineType: 'deliverable',
      quantity: 2,
      unitCost: null,
      unitPrice: 100_000,
      recurrenceType: 'one_time'
    })

    expect(result.subtotalPrice).toBe(200_000)
    expect(result.subtotalCost).toBeNull()
    expect(result.discountAmount).toBe(0)
    expect(result.subtotalAfterDiscount).toBe(200_000)
    expect(result.effectiveMarginPct).toBeNull()
  })

  it('applies percentage discount to subtotal', () => {
    const result = computeLineItemTotals({
      lineType: 'deliverable',
      quantity: 1,
      unitCost: 500_000,
      unitPrice: 1_000_000,
      discountType: 'percentage',
      discountValue: 10,
      recurrenceType: 'one_time'
    })

    expect(result.subtotalPrice).toBe(1_000_000)
    expect(result.discountAmount).toBe(100_000)
    expect(result.subtotalAfterDiscount).toBe(900_000)
    expect(result.subtotalCost).toBe(500_000)
    expect(result.effectiveMarginPct).toBeCloseTo(((900_000 - 500_000) / 900_000) * 100, 2)
  })

  it('clamps fixed discount amount to subtotal', () => {
    const result = computeLineItemTotals({
      lineType: 'deliverable',
      quantity: 1,
      unitCost: null,
      unitPrice: 200_000,
      discountType: 'fixed_amount',
      discountValue: 500_000,
      recurrenceType: 'one_time'
    })

    expect(result.discountAmount).toBe(200_000)
    expect(result.subtotalAfterDiscount).toBe(0)
  })

  it('returns null margin when cost is null even with price', () => {
    const result = computeLineItemTotals({
      lineType: 'role',
      quantity: 10,
      unitCost: null,
      unitPrice: 20_000,
      recurrenceType: 'recurring'
    })

    expect(result.effectiveMarginPct).toBeNull()
  })
})

describe('aggregateQuotationTotals', () => {
  it('aggregates line totals and applies global percentage discount', () => {
    const totals = aggregateQuotationTotals({
      lineItems: [
        { subtotalPrice: 1_000_000, subtotalCost: 500_000, discountAmount: 0, subtotalAfterDiscount: 1_000_000, effectiveMarginPct: 50, marginAmount: 500_000 },
        { subtotalPrice: 500_000, subtotalCost: 250_000, discountAmount: 50_000, subtotalAfterDiscount: 450_000, effectiveMarginPct: 44.44, marginAmount: 200_000 }
      ],
      globalDiscountType: 'percentage',
      globalDiscountValue: 10
    })

    expect(totals.totalCost).toBe(750_000)
    expect(totals.totalPriceBeforeDiscount).toBe(1_500_000)
    expect(totals.totalDiscount).toBe(50_000 + (1_000_000 + 450_000) * 0.1)
    expect(totals.totalPrice).toBe(1_450_000 - 145_000)
    expect(totals.effectiveMarginPct).not.toBeNull()
  })

  it('returns null effectiveMarginPct when price is zero and cost exists', () => {
    const totals = aggregateQuotationTotals({
      lineItems: [
        { subtotalPrice: 0, subtotalCost: 100, discountAmount: 0, subtotalAfterDiscount: 0, effectiveMarginPct: null, marginAmount: -100 }
      ]
    })

    expect(totals.totalPrice).toBe(0)
    expect(totals.effectiveMarginPct).toBeNull()
  })
})
