import { describe, expect, it } from 'vitest'

import { computeVersionDiff, deserializeSnapshotLines } from '../version-diff'

describe('computeVersionDiff', () => {
  it('detects added, removed, and changed line items and computes impact', () => {
    const previous = {
      lines: [
        { lineItemId: 'l1', label: 'Fee gestion', quantity: 1, unitPrice: 3_000_000, subtotalAfterDiscount: 3_000_000 },
        { lineItemId: 'l2', label: 'Produccion 80h', quantity: 80, unitPrice: 60_000, subtotalAfterDiscount: 4_800_000 }
      ],
      totals: { totalPrice: 7_800_000, effectiveMarginPct: 35 }
    }

    const current = {
      lines: [
        { lineItemId: 'l1', label: 'Fee gestion', quantity: 1, unitPrice: 3_200_000, subtotalAfterDiscount: 3_200_000 },
        { lineItemId: 'l3', label: 'Adaptaciones 40h', quantity: 40, unitPrice: 40_000, subtotalAfterDiscount: 1_600_000 }
      ],
      totals: { totalPrice: 4_800_000, effectiveMarginPct: 28 }
    }

    const diff = computeVersionDiff(previous, current)

    expect(diff.added.map(l => l.label)).toEqual(['Adaptaciones 40h'])
    expect(diff.removed.map(l => l.label)).toEqual(['Produccion 80h'])
    const unitPriceChange = diff.changed.find(c => c.field === 'unit_price')

    expect(unitPriceChange).toMatchObject({
      label: 'Fee gestion',
      oldValue: 3_000_000,
      newValue: 3_200_000
    })
    expect(unitPriceChange?.deltaPct).toBeCloseTo(6.67, 1)
    expect(diff.impact.previousTotal).toBe(7_800_000)
    expect(diff.impact.currentTotal).toBe(4_800_000)
    expect(diff.impact.totalDeltaPct).toBeCloseTo(-38.46, 1)
    expect(diff.impact.marginDelta).toBeCloseTo(-7, 5)
  })

  it('returns null impact deltas when totals are null', () => {
    const diff = computeVersionDiff(
      { lines: [], totals: { totalPrice: null, effectiveMarginPct: null } },
      { lines: [], totals: { totalPrice: null, effectiveMarginPct: null } }
    )

    expect(diff.added).toEqual([])
    expect(diff.removed).toEqual([])
    expect(diff.changed).toEqual([])
    expect(diff.impact.totalDeltaPct).toBeNull()
    expect(diff.impact.marginDelta).toBeNull()
  })

  it('falls back to label-based matching when lineItemId is missing', () => {
    const previous = {
      lines: [{ label: 'Item A', quantity: 1, unitPrice: 100, subtotalPrice: 100 }],
      totals: { totalPrice: 100, effectiveMarginPct: 30 }
    }

    const current = {
      lines: [{ label: 'Item A', quantity: 2, unitPrice: 100, subtotalPrice: 200 }],
      totals: { totalPrice: 200, effectiveMarginPct: 30 }
    }

    const diff = computeVersionDiff(previous, current)

    expect(diff.added).toEqual([])
    expect(diff.removed).toEqual([])
    expect(diff.changed).toHaveLength(2)
    expect(diff.changed.map(c => c.field).sort()).toEqual(['quantity', 'subtotal'])
  })
})

describe('deserializeSnapshotLines', () => {
  it('parses string JSON arrays', () => {
    const snapshot = JSON.stringify([{ lineItemId: 'l1', label: 'X' }])

    expect(deserializeSnapshotLines(snapshot)).toHaveLength(1)
  })

  it('returns arrays as-is', () => {
    const arr = [{ lineItemId: 'l1', label: 'X' }]

    expect(deserializeSnapshotLines(arr)).toBe(arr)
  })

  it('returns empty array for malformed or missing values', () => {
    expect(deserializeSnapshotLines(null)).toEqual([])
    expect(deserializeSnapshotLines(undefined)).toEqual([])
    expect(deserializeSnapshotLines('not json')).toEqual([])
    expect(deserializeSnapshotLines({ not: 'array' })).toEqual([])
  })
})
