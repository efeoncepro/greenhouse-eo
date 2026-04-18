import { describe, expect, it } from 'vitest'

import { computeRevenueMetrics, resolveLineRecurrence } from '../revenue-metrics'

describe('resolveLineRecurrence', () => {
  it('returns explicit recurring regardless of billing frequency', () => {
    expect(resolveLineRecurrence('recurring', 'one_time')).toBe('recurring')
    expect(resolveLineRecurrence('recurring', 'monthly')).toBe('recurring')
  })

  it('returns explicit one_time regardless of billing frequency', () => {
    expect(resolveLineRecurrence('one_time', 'monthly')).toBe('one_time')
  })

  it('inherits to recurring when billing frequency is monthly', () => {
    expect(resolveLineRecurrence('inherit', 'monthly')).toBe('recurring')
  })

  it('inherits to one_time for milestone or one_time frequency', () => {
    expect(resolveLineRecurrence('inherit', 'milestone')).toBe('one_time')
    expect(resolveLineRecurrence('inherit', 'one_time')).toBe('one_time')
  })
})

describe('computeRevenueMetrics', () => {
  it('computes pure one_time revenue', () => {
    const result = computeRevenueMetrics({
      lineItems: [{ subtotalAfterDiscount: 5_000_000, recurrenceType: 'one_time' }],
      billingFrequency: 'one_time',
      contractDurationMonths: null
    })

    expect(result.mrr).toBe(0)
    expect(result.arr).toBe(0)
    expect(result.tcv).toBe(5_000_000)
    expect(result.acv).toBe(5_000_000)
    expect(result.revenueType).toBe('one_time')
  })

  it('computes pure recurring with explicit duration', () => {
    const result = computeRevenueMetrics({
      lineItems: [{ subtotalAfterDiscount: 3_200_000, recurrenceType: 'recurring' }],
      billingFrequency: 'monthly',
      contractDurationMonths: 12
    })

    expect(result.mrr).toBe(3_200_000)
    expect(result.arr).toBe(3_200_000 * 12)
    expect(result.tcv).toBe(3_200_000 * 12)
    expect(result.acv).toBe(3_200_000 * 12)
    expect(result.revenueType).toBe('recurring')
  })

  it('inherits recurrence from monthly billing for inherit lines', () => {
    const result = computeRevenueMetrics({
      lineItems: [{ subtotalAfterDiscount: 1_000_000, recurrenceType: 'inherit' }],
      billingFrequency: 'monthly',
      contractDurationMonths: 6
    })

    expect(result.mrr).toBe(1_000_000)
    expect(result.tcv).toBe(6_000_000)
  })

  it('computes hybrid quotation with recurring + one_time lines', () => {
    const result = computeRevenueMetrics({
      lineItems: [
        { subtotalAfterDiscount: 3_200_000, recurrenceType: 'recurring' },
        { subtotalAfterDiscount: 4_800_000, recurrenceType: 'recurring' },
        { subtotalAfterDiscount: 1_600_000, recurrenceType: 'inherit' },
        { subtotalAfterDiscount: 5_000_000, recurrenceType: 'one_time' }
      ],
      billingFrequency: 'monthly',
      contractDurationMonths: 12
    })

    expect(result.mrr).toBe(3_200_000 + 4_800_000 + 1_600_000)
    expect(result.tcv).toBe(result.mrr * 12 + 5_000_000)
    expect(result.revenueType).toBe('hybrid')
    expect(result.acv).toBe(result.tcv)
  })

  it('returns null TCV/ACV when duration is null and recurring lines exist', () => {
    const result = computeRevenueMetrics({
      lineItems: [{ subtotalAfterDiscount: 3_200_000, recurrenceType: 'recurring' }],
      billingFrequency: 'monthly',
      contractDurationMonths: null
    })

    expect(result.tcv).toBeNull()
    expect(result.acv).toBeNull()
  })

  it('divides ACV across years when contract spans more than 12 months', () => {
    const result = computeRevenueMetrics({
      lineItems: [{ subtotalAfterDiscount: 1_000_000, recurrenceType: 'recurring' }],
      billingFrequency: 'monthly',
      contractDurationMonths: 24
    })

    expect(result.mrr).toBe(1_000_000)
    expect(result.tcv).toBe(24_000_000)
    expect(result.acv).toBe(12_000_000)
  })
})
