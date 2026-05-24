/**
 * TASK-929 — materiality routing for the ledger drift inventory.
 *
 * Materiality governs routing (human review vs batch-accept), never detection.
 * The bucket function is pure → tested without a DB.
 */
import { describe, expect, it } from 'vitest'

import { bucketUnanchoredByMateriality, type UnanchoredExpenseItem } from './inventory'

const item = (expenseId: string, totalAmount: number): UnanchoredExpenseItem => ({
  expenseId,
  expenseType: 'supplier',
  economicCategory: 'vendor_cost_saas',
  totalAmount,
  paymentDate: '2026-04-01'
})

describe('bucketUnanchoredByMateriality', () => {
  it('routes >= threshold to material, < threshold to immaterial', () => {
    const items = [item('EXP-1', 100_000), item('EXP-2', 49_999), item('EXP-3', 50_000)]

    const { material, immaterial } = bucketUnanchoredByMateriality(items, 50_000)

    expect(material.map(i => i.expenseId)).toEqual(['EXP-1', 'EXP-3'])
    expect(immaterial.map(i => i.expenseId)).toEqual(['EXP-2'])
  })

  it('uses absolute amount (negative adjustments routed by magnitude)', () => {
    const { material, immaterial } = bucketUnanchoredByMateriality([item('EXP-NEG', -80_000)], 50_000)

    expect(material).toHaveLength(1)
    expect(immaterial).toHaveLength(0)
  })

  it('empty input yields empty buckets', () => {
    const { material, immaterial } = bucketUnanchoredByMateriality([], 50_000)

    expect(material).toEqual([])
    expect(immaterial).toEqual([])
  })
})
