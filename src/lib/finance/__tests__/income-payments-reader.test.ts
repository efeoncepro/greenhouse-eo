import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FinanceValidationError } from '@/lib/finance/shared'

vi.mock('server-only', () => ({}))

const executedSql: string[] = []
const queuedResults: Array<{ rows: Array<Record<string, unknown>> }> = []

const renderSql = (strings: TemplateStringsArray) =>
  strings.reduce(
    (query, fragment, index) =>
      `${query}${fragment}${index < strings.length - 1 ? `$${index + 1}` : ''}`,
    ''
  )

vi.mock('kysely', () => {
  const sql = (strings: TemplateStringsArray) => ({
    execute: vi.fn(async () => {
      executedSql.push(renderSql(strings))

      return queuedResults.shift() ?? { rows: [] }
    })
  })

  return { sql }
})

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(async () => ({}))
}))

import {
  getIncomePaymentsClpDriftCount,
  listIncomePaymentsNormalized,
  sumIncomePaymentsClpForPeriod
} from '@/lib/finance/income-payments-reader'

describe('income-payments-reader (TASK-766 canonical CLP reader)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    executedSql.length = 0
    queuedResults.length = 0
  })

  describe('sumIncomePaymentsClpForPeriod', () => {
    it('reads from the canonical VIEW income_payments_normalized', async () => {
      queuedResults.push({ rows: [] })

      await sumIncomePaymentsClpForPeriod({
        fromDate: '2026-04-01',
        toDate: '2026-05-02'
      })

      expect(executedSql[0]).toContain('greenhouse_finance.income_payments_normalized')
      expect(executedSql[0]).not.toContain('ip.amount * exchange_rate_to_clp')
      expect(executedSql[0]).not.toContain('exchange_rate_to_clp')
    })

    it('uses payment_amount_clp from the VIEW', async () => {
      queuedResults.push({ rows: [] })

      await sumIncomePaymentsClpForPeriod({
        fromDate: '2026-04-01',
        toDate: '2026-05-02'
      })

      expect(executedSql[0]).toContain('SUM(ip.payment_amount_clp)')
    })

    it('returns canonical totals + drift count', async () => {
      queuedResults.push({
        rows: [
          {
            total_clp: '8500000',
            total_payments: '23',
            unreconciled_count: '4',
            drift_count: '0'
          }
        ]
      })

      const summary = await sumIncomePaymentsClpForPeriod({
        fromDate: '2026-04-01',
        toDate: '2026-05-02'
      })

      expect(summary.totalClp).toBe(8_500_000)
      expect(summary.totalPayments).toBe(23)
      expect(summary.unreconciledCount).toBe(4)
      expect(summary.driftCount).toBe(0)
    })

    it('rejects invalid date formats', async () => {
      await expect(
        sumIncomePaymentsClpForPeriod({ fromDate: 'not-a-date', toDate: '2026-05-02' })
      ).rejects.toBeInstanceOf(FinanceValidationError)
    })

    it('rejects fromDate > toDate', async () => {
      await expect(
        sumIncomePaymentsClpForPeriod({ fromDate: '2026-06-01', toDate: '2026-05-02' })
      ).rejects.toBeInstanceOf(FinanceValidationError)
    })
  })

  describe('listIncomePaymentsNormalized', () => {
    it('returns paginated payments + propagates hasClpDrift', async () => {
      queuedResults.push({ rows: [{ total: '23' }] })
      queuedResults.push({
        rows: [
          {
            payment_id: 'inc-pay-1',
            income_id: 'INC-2026-04-001',
            payment_date: '2026-04-15',
            payment_amount_native: '500',
            payment_currency: 'USD',
            payment_amount_clp: null,
            exchange_rate_at_payment: null,
            fx_gain_loss_clp: null,
            payment_account_id: 'santander-usd-usd',
            payment_method: 'wire',
            payment_source: 'manual',
            is_reconciled: false,
            reference: null,
            recorded_at: '2026-04-15T00:00:00Z',
            created_at: '2026-04-15T00:00:00Z',
            has_clp_drift: true
          }
        ]
      })

      const result = await listIncomePaymentsNormalized({
        fromDate: '2026-04-01',
        toDate: '2026-05-02'
      })

      expect(result.total).toBe(23)
      expect(result.items[0].paymentAmountClp).toBeNull()
      expect(result.items[0].hasClpDrift).toBe(true)
    })
  })

  describe('getIncomePaymentsClpDriftCount', () => {
    it('returns drift count from the VIEW', async () => {
      // 21 filas reportadas por SQL discovery contra producción
      queuedResults.push({ rows: [{ drift_count: '21' }] })

      const count = await getIncomePaymentsClpDriftCount()

      expect(count).toBe(21)
      expect(executedSql[0]).toContain('income_payments_normalized')
      expect(executedSql[0]).toContain('has_clp_drift = TRUE')
    })
  })
})
