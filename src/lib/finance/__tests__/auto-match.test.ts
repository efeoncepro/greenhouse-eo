import { describe, expect, it, vi } from 'vitest'

import {
  amountMatches,
  dateMatchesWithinWindow,
  hasPartialReferenceMatch,
  persistAutoMatchDecisions,
  scoreAutoMatches,
  type AutoMatchDecision,
  type AutoMatchRow
} from '@/lib/finance/auto-match'
import type { ReconciliationCandidate } from '@/lib/finance/reconciliation'

const makeCandidate = (overrides: Partial<ReconciliationCandidate> = {}): ReconciliationCandidate => ({
  id: 'cand-1',
  type: 'income',
  amount: 1000,
  currency: 'CLP',
  transactionDate: '2026-03-15',
  dueDate: null,
  reference: 'INV-001',
  description: 'Factura cliente',
  partyName: 'Sky Airline',
  status: 'pending',
  isReconciled: false,
  reconciliationId: null,
  matchedRecordId: 'inc-1',
  matchedPaymentId: 'pay-1',
  ...overrides
})

const makeRow = (overrides: Partial<AutoMatchRow> = {}): AutoMatchRow => ({
  rowId: 'row-1',
  transactionDate: '2026-03-15',
  description: 'Transferencia cliente Sky INV-001',
  reference: null,
  amount: 1000,
  ...overrides
})

describe('auto-match scoring helpers', () => {
  describe('amountMatches', () => {
    it('treats exact amounts as matching', () => {
      expect(amountMatches(1000, 1000)).toBe(true)
    })

    it('tolerates up to 1 unit difference (rounding)', () => {
      expect(amountMatches(1000, 1001)).toBe(true)
      expect(amountMatches(1000, 999)).toBe(true)
    })

    it('rejects differences above 1 unit', () => {
      expect(amountMatches(1000, 1002)).toBe(false)
      expect(amountMatches(1000, 998)).toBe(false)
    })
  })

  describe('dateMatchesWithinWindow', () => {
    it('returns true for exact date match', () => {
      expect(dateMatchesWithinWindow('2026-03-15', '2026-03-15')).toBe(true)
    })

    it('returns true within default 3-day window', () => {
      expect(dateMatchesWithinWindow('2026-03-15', '2026-03-17')).toBe(true)
      expect(dateMatchesWithinWindow('2026-03-15', '2026-03-13')).toBe(true)
    })

    it('returns false beyond the window', () => {
      expect(dateMatchesWithinWindow('2026-03-15', '2026-03-20')).toBe(false)
    })

    it('respects custom window', () => {
      expect(dateMatchesWithinWindow('2026-03-15', '2026-03-20', 5)).toBe(true)
      expect(dateMatchesWithinWindow('2026-03-15', '2026-03-21', 5)).toBe(false)
    })

    it('returns false when either date is null', () => {
      expect(dateMatchesWithinWindow(null, '2026-03-15')).toBe(false)
      expect(dateMatchesWithinWindow('2026-03-15', null)).toBe(false)
    })
  })

  describe('hasPartialReferenceMatch', () => {
    it('returns true when statement text contains reference', () => {
      expect(hasPartialReferenceMatch('pago factura inv-001 gracias', 'INV-001')).toBe(true)
    })

    it('returns true when reference contains statement text', () => {
      expect(hasPartialReferenceMatch('inv-001', 'INV-001-partial')).toBe(true)
    })

    it('returns true on 4-char prefix substring fallback', () => {
      expect(hasPartialReferenceMatch('pago inv-aaaa xxx', 'INV-XXXX')).toBe(true)
    })

    it('returns false on unrelated strings', () => {
      expect(hasPartialReferenceMatch('pago transferencia', 'XYZ-999')).toBe(false)
    })

    it('returns false when reference is empty or null', () => {
      expect(hasPartialReferenceMatch('pago factura inv-001', null)).toBe(false)
      expect(hasPartialReferenceMatch('', 'INV-001')).toBe(false)
    })
  })
})

describe('scoreAutoMatches', () => {
  it('returns empty decisions for empty inputs', () => {
    const result = scoreAutoMatches({ unmatchedRows: [], candidates: [] })

    expect(result).toEqual({ decisions: [], matched: 0, suggested: 0, skipped: 0 })
  })

  it('auto-applies a confidence 0.95 match (reference in text)', () => {
    const result = scoreAutoMatches({
      unmatchedRows: [makeRow({ description: 'Pago recibido INV-001 cliente sky' })],
      candidates: [makeCandidate()]
    })

    expect(result.matched).toBe(1)
    expect(result.suggested).toBe(0)
    expect(result.decisions[0]).toMatchObject({ confidence: 0.95, autoApplied: true })
  })

  it('auto-applies a 0.95 match when only the reference overlaps (no date constraint needed)', () => {
    const result = scoreAutoMatches({
      unmatchedRows: [
        makeRow({
          description: 'Transferencia cliente ref inv001',
          reference: null,
          transactionDate: '2030-01-01'
        })
      ],
      candidates: [makeCandidate({ reference: 'inv001-long', transactionDate: '2026-03-15' })]
    })

    expect(result.matched).toBe(1)
    expect(result.decisions[0].confidence).toBe(0.95)
    expect(result.decisions[0].autoApplied).toBe(true)
  })

  it('marks a date-only match as suggested (confidence 0.70, below threshold)', () => {
    const result = scoreAutoMatches({
      unmatchedRows: [
        makeRow({ description: 'Transferencia', reference: null, transactionDate: '2026-03-16' })
      ],
      candidates: [makeCandidate({ reference: null, description: 'X' })]
    })

    expect(result.matched).toBe(0)
    expect(result.suggested).toBe(1)
    expect(result.decisions[0].confidence).toBe(0.7)
    expect(result.decisions[0].autoApplied).toBe(false)
  })

  it('skips rows with no amount match', () => {
    const result = scoreAutoMatches({
      unmatchedRows: [makeRow({ amount: 2000 })],
      candidates: [makeCandidate({ amount: 1000 })]
    })

    expect(result.skipped).toBe(1)
    expect(result.decisions).toHaveLength(0)
  })

  it('discards ambiguous matches (two candidates at the same confidence)', () => {
    const result = scoreAutoMatches({
      unmatchedRows: [
        makeRow({ description: 'Transferencia', reference: null, transactionDate: '2026-03-15' })
      ],
      candidates: [
        makeCandidate({ id: 'cand-1', reference: null, description: 'X' }),
        makeCandidate({ id: 'cand-2', reference: null, description: 'Y' })
      ]
    })

    expect(result.matched).toBe(0)
    expect(result.suggested).toBe(0)
    expect(result.skipped).toBe(1)
  })

  it('does not re-use a candidate already matched in the same run', () => {
    const result = scoreAutoMatches({
      unmatchedRows: [
        makeRow({ rowId: 'row-a', description: 'Pago INV-001' }),
        makeRow({ rowId: 'row-b', description: 'Pago INV-001' })
      ],
      candidates: [makeCandidate()]
    })

    expect(result.matched).toBe(1)
    expect(result.decisions.filter(d => d.autoApplied)).toHaveLength(1)
  })

  it('respects custom autoApplyThreshold', () => {
    const result = scoreAutoMatches({
      unmatchedRows: [
        makeRow({ description: 'Transferencia', reference: null, transactionDate: '2026-03-15' })
      ],
      candidates: [makeCandidate({ reference: null, description: 'X' })],
      autoApplyThreshold: 0.5
    })

    expect(result.matched).toBe(1)
    expect(result.decisions[0].autoApplied).toBe(true)
  })
})

describe('persistAutoMatchDecisions', () => {
  const baseDecision: AutoMatchDecision = {
    rowId: 'row-1',
    candidate: {
      id: 'cand-1',
      type: 'income',
      amount: 1000,
      currency: 'CLP',
      transactionDate: '2026-03-15',
      dueDate: null,
      reference: 'INV-001',
      description: 'Factura',
      partyName: 'Sky',
      status: 'pending',
      isReconciled: false,
      reconciliationId: null,
      matchedRecordId: 'inc-1',
      matchedPaymentId: 'pay-1'
    },
    confidence: 0.95,
    autoApplied: true
  }

  it('calls both updateStatementRow and setReconciliationLink for auto-applied matches', async () => {
    const updateStatementRow = vi.fn().mockResolvedValue(undefined)
    const setReconciliationLink = vi.fn().mockResolvedValue(undefined)

    const result = await persistAutoMatchDecisions({
      decisions: [baseDecision],
      rowPeriodMap: new Map([['row-1', 'period-1']]),
      actorUserId: 'user-1',
      callbacks: { updateStatementRow, setReconciliationLink }
    })

    expect(result).toEqual({ applied: 1, suggested: 0 })
    expect(updateStatementRow).toHaveBeenCalledTimes(1)
    expect(updateStatementRow).toHaveBeenCalledWith(
      expect.objectContaining({
        rowId: 'row-1',
        periodId: 'period-1',
        matchStatus: 'auto_matched',
        matchedType: 'income',
        matchedId: 'inc-1',
        matchedByUserId: 'user-1'
      })
    )
    expect(setReconciliationLink).toHaveBeenCalledTimes(1)
  })

  it('skips setReconciliationLink for suggested (non-auto-applied) matches', async () => {
    const updateStatementRow = vi.fn().mockResolvedValue(undefined)
    const setReconciliationLink = vi.fn().mockResolvedValue(undefined)

    const result = await persistAutoMatchDecisions({
      decisions: [{ ...baseDecision, autoApplied: false, confidence: 0.7 }],
      rowPeriodMap: new Map([['row-1', 'period-1']]),
      actorUserId: null,
      callbacks: { updateStatementRow, setReconciliationLink }
    })

    expect(result).toEqual({ applied: 0, suggested: 1 })
    expect(updateStatementRow).toHaveBeenCalledWith(
      expect.objectContaining({ matchStatus: 'suggested', matchedByUserId: null })
    )
    expect(setReconciliationLink).not.toHaveBeenCalled()
  })

  it('skips decisions whose rowId has no period in the map', async () => {
    const updateStatementRow = vi.fn().mockResolvedValue(undefined)
    const setReconciliationLink = vi.fn().mockResolvedValue(undefined)

    const result = await persistAutoMatchDecisions({
      decisions: [baseDecision],
      rowPeriodMap: new Map(),
      actorUserId: 'user-1',
      callbacks: { updateStatementRow, setReconciliationLink }
    })

    expect(result).toEqual({ applied: 0, suggested: 0 })
    expect(updateStatementRow).not.toHaveBeenCalled()
    expect(setReconciliationLink).not.toHaveBeenCalled()
  })

  it('falls back to actorUserId="auto" when no userId is provided', async () => {
    const updateStatementRow = vi.fn().mockResolvedValue(undefined)
    const setReconciliationLink = vi.fn().mockResolvedValue(undefined)

    await persistAutoMatchDecisions({
      decisions: [baseDecision],
      rowPeriodMap: new Map([['row-1', 'period-1']]),
      actorUserId: null,
      callbacks: { updateStatementRow, setReconciliationLink }
    })

    expect(updateStatementRow).toHaveBeenCalledWith(
      expect.objectContaining({ matchedByUserId: 'auto' })
    )
    expect(setReconciliationLink).toHaveBeenCalledWith(
      expect.objectContaining({ matchedBy: 'auto' })
    )
  })
})
