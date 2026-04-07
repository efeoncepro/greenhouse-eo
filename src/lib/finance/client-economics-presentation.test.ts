import { describe, expect, it } from 'vitest'

import { sanitizeSnapshotForPresentation } from '@/lib/finance/client-economics-presentation'

const makeSnapshot = (overrides: Partial<{
  totalRevenueClp: number
  directCostsClp: number
  indirectCostsClp: number
  grossMarginPercent: number | null
  netMarginPercent: number | null
  notes: string | null
}> = {}) => ({
  totalRevenueClp: 100000,
  directCostsClp: 25000,
  indirectCostsClp: 5000,
  grossMarginPercent: 0.7,
  netMarginPercent: 0.65,
  notes: null as string | null,
  ...overrides
})

describe('sanitizeSnapshotForPresentation', () => {
  describe('completitud de snapshots', () => {
    it('computes 100% margin when costs are zero but revenue exists', () => {
      const result = sanitizeSnapshotForPresentation(makeSnapshot({
        directCostsClp: 0,
        indirectCostsClp: 0,
        grossMarginPercent: 0.99,
        netMarginPercent: 0.99
      }))

      expect(result.hasCompleteCostCoverage).toBe(true)
      expect(result.grossMarginPercent).toBe(1.0)
      expect(result.netMarginPercent).toBe(1.0)
    })

    it('keeps margins when coverage is materially present', () => {
      const result = sanitizeSnapshotForPresentation(makeSnapshot())

      expect(result.hasCompleteCostCoverage).toBe(true)
      expect(result.grossMarginPercent).toBe(0.7)
      expect(result.netMarginPercent).toBe(0.65)
    })

    it('flags backfill snapshots with suspiciously low costs', () => {
      const result = sanitizeSnapshotForPresentation(makeSnapshot({
        directCostsClp: 1225,
        indirectCostsClp: 0,
        notes: 'Backfill from Codex for organization finance visibility'
      }))

      expect(result.hasCompleteCostCoverage).toBe(false)
      expect(result.grossMarginPercent).toBeNull()
    })

    it('accepts non-backfill snapshots even with low costs', () => {
      const result = sanitizeSnapshotForPresentation(makeSnapshot({
        directCostsClp: 1225,
        indirectCostsClp: 0,
        notes: 'monthly materialization'
      }))

      expect(result.hasCompleteCostCoverage).toBe(true)
      expect(result.grossMarginPercent).toBe(0.7)
    })

    it('keeps original values when revenue is zero', () => {
      const result = sanitizeSnapshotForPresentation(makeSnapshot({
        totalRevenueClp: 0,
        directCostsClp: 0,
        indirectCostsClp: 0,
        grossMarginPercent: null,
        netMarginPercent: null
      }))

      expect(result.hasCompleteCostCoverage).toBe(true)
    })

    it('preserves all original fields in output', () => {
      const input = makeSnapshot({ notes: 'test-run' })
      const result = sanitizeSnapshotForPresentation(input)

      expect(result.totalRevenueClp).toBe(input.totalRevenueClp)
      expect(result.directCostsClp).toBe(input.directCostsClp)
      expect(result.notes).toBe('test-run')
    })
  })

  describe('trend sanitization', () => {
    it('sanitizes an array of snapshots consistently', () => {
      const trend = [
        makeSnapshot({ directCostsClp: 0, indirectCostsClp: 0, grossMarginPercent: 0.99 }),
        makeSnapshot({ directCostsClp: 50000, grossMarginPercent: 0.5 }),
        makeSnapshot({ directCostsClp: 1000, indirectCostsClp: 0, notes: 'Backfill manual', grossMarginPercent: 0.95 })
      ].map(sanitizeSnapshotForPresentation)

      expect(trend[0].hasCompleteCostCoverage).toBe(true)
      expect(trend[0].grossMarginPercent).toBe(1.0)

      expect(trend[1].hasCompleteCostCoverage).toBe(true)
      expect(trend[1].grossMarginPercent).toBe(0.5)

      expect(trend[2].hasCompleteCostCoverage).toBe(false)
      expect(trend[2].grossMarginPercent).toBeNull()
    })
  })
})
