import { describe, it, expect } from 'vitest'

import {
  matchDte,
  DTE_AUTO_MATCH_THRESHOLD,
  DTE_REVIEW_THRESHOLD,
  type DteRecord,
  type FinanceCandidate
} from './dte-matching'

const makeDte = (overrides: Partial<DteRecord> = {}): DteRecord => ({
  dteSourceId: '12345',
  dteSource: 'nubox_sale',
  folio: '1001',
  dteTypeCode: '33',
  totalAmount: 1000000,
  emissionDate: '2025-03-15',
  counterpartRut: '76.123.456-7',
  counterpartName: 'Acme Corp',
  organizationId: 'org-001',
  ...overrides
})

const makeCandidate = (overrides: Partial<FinanceCandidate> = {}): FinanceCandidate => ({
  financeId: 'INC-001',
  financeType: 'income',
  totalAmount: 1000000,
  documentDate: '2025-03-15',
  dueDate: '2025-04-15',
  documentNumber: '1001',
  counterpartRut: '76.123.456-7',
  counterpartName: 'Acme Corp',
  organizationId: 'org-001',
  nuboxLinked: false,
  ...overrides
})

describe('matchDte', () => {
  it('returns high confidence when all signals match (amount, RUT, folio, date, org)', () => {
    const dte = makeDte()
    const candidates = [makeCandidate()]

    const result = matchDte(dte, candidates)

    expect(result.financeId).toBe('INC-001')
    expect(result.confidence).toBeGreaterThanOrEqual(DTE_AUTO_MATCH_THRESHOLD)
    expect(result.signals.length).toBeGreaterThanOrEqual(4)
    expect(result.amountDiscrepancy).toBe(0)
  })

  it('returns no match when there are no eligible candidates', () => {
    const dte = makeDte()
    const candidates: FinanceCandidate[] = []

    const result = matchDte(dte, candidates)

    expect(result.financeId).toBeNull()
    expect(result.confidence).toBe(0)
    expect(result.signals).toHaveLength(0)
  })

  it('skips candidates that are already nubox-linked', () => {
    const dte = makeDte()
    const candidates = [makeCandidate({ nuboxLinked: true })]

    const result = matchDte(dte, candidates)

    expect(result.financeId).toBeNull()
    expect(result.confidence).toBe(0)
  })

  it('only matches income DTEs against income candidates', () => {
    const dte = makeDte({ dteSource: 'nubox_sale' })
    const candidates = [makeCandidate({ financeType: 'expense' })]

    const result = matchDte(dte, candidates)

    expect(result.financeId).toBeNull()
    expect(result.financeType).toBe('income')
  })

  it('only matches purchase DTEs against expense candidates', () => {
    const dte = makeDte({ dteSource: 'nubox_purchase' })
    const candidates = [makeCandidate({ financeType: 'expense', nuboxLinked: false })]

    const result = matchDte(dte, candidates)

    expect(result.financeId).toBe('INC-001')
    expect(result.financeType).toBe('expense')
  })

  it('detects amount discrepancy when amounts differ', () => {
    const dte = makeDte({ totalAmount: 1050000 }) // DTE is 50k more
    const candidates = [makeCandidate({ totalAmount: 1000000 })]

    const result = matchDte(dte, candidates)

    expect(result.financeId).toBe('INC-001')
    expect(result.amountDiscrepancy).toBe(50000)
  })

  it('gives amount_close signal for amounts within 5% tolerance', () => {
    const dte = makeDte({ totalAmount: 1040000 }) // 4% diff
    const candidates = [makeCandidate({ totalAmount: 1000000 })]

    const result = matchDte(dte, candidates)

    expect(result.signals.some(s => s.signal === 'amount_close')).toBe(true)
  })

  it('gives no amount signal for amounts beyond 5% tolerance', () => {
    const dte = makeDte({ totalAmount: 2000000 }) // 100% diff
    const candidates = [makeCandidate({ totalAmount: 1000000 })]

    const result = matchDte(dte, candidates)

    expect(result.signals.some(s => s.signal === 'amount_exact')).toBe(false)
    expect(result.signals.some(s => s.signal === 'amount_close')).toBe(false)
  })

  it('normalizes RUT for comparison (strips dots and dashes)', () => {
    const dte = makeDte({ counterpartRut: '76.123.456-7' })
    const candidates = [makeCandidate({ counterpartRut: '761234567' })]

    const result = matchDte(dte, candidates)

    expect(result.signals.some(s => s.signal === 'rut_exact')).toBe(true)
  })

  it('gives date_close signal when dates are within 7 days', () => {
    const dte = makeDte({ emissionDate: '2025-03-15' })
    const candidates = [makeCandidate({ documentDate: '2025-03-20' })] // 5 days diff

    const result = matchDte(dte, candidates)

    expect(result.signals.some(s => s.signal === 'date_close')).toBe(true)
    expect(result.signals.some(s => s.signal === 'date_exact')).toBe(false)
  })

  it('returns review-range confidence for partial matches', () => {
    // Only RUT + org match, no amount/folio/date match
    const dte = makeDte({
      totalAmount: 5000000,
      folio: '9999',
      emissionDate: '2024-01-01'
    })

    const candidates = [
      makeCandidate({
        totalAmount: 1000000,
        documentNumber: '1001',
        documentDate: '2025-03-15'
      })
    ]

    const result = matchDte(dte, candidates)

    // Only rut_exact + org_match should fire
    expect(result.confidence).toBeGreaterThanOrEqual(DTE_REVIEW_THRESHOLD)
    expect(result.confidence).toBeLessThan(DTE_AUTO_MATCH_THRESHOLD)
  })

  it('picks the best match among multiple candidates', () => {
    const dte = makeDte({ totalAmount: 500000, folio: '2002' })

    const candidates = [
      makeCandidate({
        financeId: 'INC-WEAK',
        totalAmount: 300000,
        documentNumber: '1001',
        counterpartRut: null,
        organizationId: null
      }),
      makeCandidate({
        financeId: 'INC-STRONG',
        totalAmount: 500000,
        documentNumber: '2002'
      })
    ]

    const result = matchDte(dte, candidates)

    expect(result.financeId).toBe('INC-STRONG')
  })
})
