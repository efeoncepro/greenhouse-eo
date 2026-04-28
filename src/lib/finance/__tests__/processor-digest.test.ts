/**
 * TASK-706 — Processor digest tests.
 *
 * Asserts:
 *   1. inferProcessorScope returns null for non-processor accounts.
 *   2. inferProcessorScope returns Previred scope for previred-clp.
 *   3. getProcessorDigest aggregates payments + payer accounts correctly.
 *   4. componentizationStatus derivation: none / pending / componentized.
 *   5. Empty result still returns a valid digest (not null) when scope matched.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRunQuery = vi.fn<(sql: string, params?: unknown[]) => Promise<unknown[]>>()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (sql: string, params?: unknown[]) => mockRunQuery(sql, params)
}))

import { getProcessorDigest, inferProcessorScope } from '@/lib/finance/processor-digest'

beforeEach(() => {
  mockRunQuery.mockReset()
})

describe('inferProcessorScope', () => {
  it('returns null for non-processor categories', () => {
    expect(inferProcessorScope({
      accountId: 'santander-clp',
      instrumentCategory: 'bank_account'
    })).toBeNull()

    expect(inferProcessorScope({
      accountId: 'santander-corp-clp',
      instrumentCategory: 'credit_card'
    })).toBeNull()
  })

  it('returns Previred scope for previred-clp', () => {
    const scope = inferProcessorScope({
      accountId: 'previred-clp',
      instrumentCategory: 'payroll_processor'
    })

    expect(scope).toEqual({ keywords: ['previred'], expenseType: 'social_security' })
  })

  it('returns null for unknown processor account', () => {
    const scope = inferProcessorScope({
      accountId: 'sii-iva-clp',
      instrumentCategory: 'payroll_processor'
    })

    expect(scope).toBeNull()
  })
})

const previredInput = {
  accountId: 'previred-clp',
  accountName: 'Previred',
  instrumentCategory: 'payroll_processor',
  providerSlug: 'previred',
  periodStart: '2026-04-01',
  periodEnd: '2026-04-30'
}

describe('getProcessorDigest', () => {
  it('returns null for non-processor account (no DB call)', async () => {
    const result = await getProcessorDigest({
      ...previredInput,
      accountId: 'santander-clp',
      instrumentCategory: 'bank_account'
    })

    expect(result).toBeNull()
    expect(mockRunQuery).not.toHaveBeenCalled()
  })

  it('returns digest with status=none when scope matched but no payments found', async () => {
    mockRunQuery.mockResolvedValueOnce([])

    const result = await getProcessorDigest(previredInput)

    expect(result).not.toBeNull()
    expect(result?.componentizationStatus).toBe('none')
    expect(result?.paymentCount).toBe(0)
    expect(result?.processedAmount).toBe(0)
    expect(result?.payerAccounts).toEqual([])
    expect(result?.payments).toEqual([])
  })

  it('aggregates payer accounts and computes pending_componentization', async () => {
    mockRunQuery.mockResolvedValueOnce([
      {
        payment_id: 'exp-pay-1',
        expense_id: 'EXP-1',
        payment_date: '2026-04-13',
        amount: '276223.00',
        amount_clp: '276223.00',
        currency: 'CLP',
        payment_account_id: 'santander-clp',
        payer_account_name: 'Santander',
        reference: 'sclp-20260413-previred-276223',
        expense_type: 'social_security',
        social_security_institution: 'Previred',
        payroll_period_id: null,
        period_year: 2026,
        period_month: 3,
        is_reconciled: false
      },
      {
        payment_id: 'exp-pay-2',
        expense_id: 'EXP-2',
        payment_date: '2026-04-13',
        amount: '100000.00',
        amount_clp: '100000.00',
        currency: 'CLP',
        payment_account_id: 'santander-clp',
        payer_account_name: 'Santander',
        reference: 'aux',
        expense_type: 'social_security',
        social_security_institution: 'Previred',
        payroll_period_id: 'PP-202603',
        period_year: 2026,
        period_month: 3,
        is_reconciled: true
      }
    ])

    const result = await getProcessorDigest(previredInput)

    expect(result?.paymentCount).toBe(2)
    expect(result?.processedAmount).toBe(376223)
    expect(result?.payerAccounts).toEqual([
      { accountId: 'santander-clp', accountName: 'Santander', amount: 376223 }
    ])
    expect(result?.componentizationStatus).toBe('pending_componentization')
  })

  it('flags componentized when ALL payments have payroll_period_id AND is_reconciled', async () => {
    mockRunQuery.mockResolvedValueOnce([
      {
        payment_id: 'exp-pay-1',
        expense_id: 'EXP-1',
        payment_date: '2026-04-13',
        amount: '276223.00',
        amount_clp: '276223.00',
        currency: 'CLP',
        payment_account_id: 'santander-clp',
        payer_account_name: 'Santander',
        reference: 'sclp-20260413-previred-276223',
        expense_type: 'social_security',
        social_security_institution: 'Previred',
        payroll_period_id: 'PP-202603',
        period_year: 2026,
        period_month: 3,
        is_reconciled: true
      }
    ])

    const result = await getProcessorDigest(previredInput)

    expect(result?.componentizationStatus).toBe('componentized')
  })

  it('passes scope keywords + period bounds + expense_type as SQL params', async () => {
    mockRunQuery.mockResolvedValueOnce([])

    await getProcessorDigest(previredInput)

    expect(mockRunQuery).toHaveBeenCalledTimes(1)
    const [sql, params] = mockRunQuery.mock.calls[0]

    expect(typeof sql).toBe('string')
    expect(sql).toContain('expense_payments')
    expect(sql).toContain('expenses')
    expect(sql).toContain('superseded_at IS NULL')
    expect(sql).toContain('superseded_by_payment_id IS NULL')
    expect(sql).toContain('superseded_by_otb_id IS NULL')
    expect(params).toEqual(['2026-04-01', '2026-04-30', 'social_security', ['previred']])
  })
})
