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
  getExpensePaymentsClpDriftCount,
  listExpensePaymentsNormalized,
  sumExpensePaymentsClpForPeriod
} from '@/lib/finance/expense-payments-reader'

describe('expense-payments-reader (TASK-766 canonical CLP reader)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    executedSql.length = 0
    queuedResults.length = 0
  })

  describe('sumExpensePaymentsClpForPeriod', () => {
    it('reads from the canonical VIEW expense_payments_normalized (single source of truth)', async () => {
      queuedResults.push({ rows: [] })

      await sumExpensePaymentsClpForPeriod({
        fromDate: '2026-04-01',
        toDate: '2026-05-02'
      })

      expect(executedSql[0]).toContain('greenhouse_finance.expense_payments_normalized')
      // Guardrail: helper must never re-derive monto_clp via the broken anti-pattern.
      expect(executedSql[0]).not.toContain('ep.amount * exchange_rate_to_clp')
      expect(executedSql[0]).not.toContain('exchange_rate_to_clp')
    })

    it('uses payment_amount_clp from the VIEW (the COALESCE chain canónica)', async () => {
      queuedResults.push({ rows: [] })

      await sumExpensePaymentsClpForPeriod({
        fromDate: '2026-04-01',
        toDate: '2026-05-02'
      })

      // SUMs deben sumar payment_amount_clp (canónico VIEW), no ep.amount.
      expect(executedSql[0]).toContain('SUM(ep.payment_amount_clp)')
    })

    it('returns canonical totals from the incident dataset (HubSpot CCA scenario)', async () => {
      // Caso real del incidente 2026-05-02: 1 payment HubSpot CCA $1,106,321 CLP
      // sobre un expense USD con rate 910.55. El SQL broken devolvía
      // $1,007,363,090 fantasma. La VIEW devuelve $1,106,321 canonical.
      queuedResults.push({
        rows: [
          {
            total_clp: '11546493.17',
            total_payments: '37',
            unreconciled_count: '37',
            supplier_clp: '5321241.00',
            payroll_clp: '1432644.17',
            fiscal_clp: '4308114.00',
            drift_count: '0'
          }
        ]
      })

      const summary = await sumExpensePaymentsClpForPeriod({
        fromDate: '2026-04-01',
        toDate: '2026-05-02'
      })

      // Anti-regresión hard: si volvieran los $1B fantasma el helper debería
      // devolverlos. Confirmamos el shape canónico.
      expect(summary.totalClp).toBe(11_546_493.17)
      expect(summary.supplierClp).toBe(5_321_241)
      expect(summary.payrollClp).toBe(1_432_644.17)
      expect(summary.fiscalClp).toBe(4_308_114)
      expect(summary.totalPayments).toBe(37)
      expect(summary.driftCount).toBe(0)

      // El total NUNCA puede aproximarse a $1B con un dataset pequeño.
      expect(summary.totalClp).toBeLessThan(20_000_000)
    })

    it('emits drift_count signal for non-CLP payments without amount_clp', async () => {
      queuedResults.push({
        rows: [
          {
            total_clp: '5000000',
            total_payments: '12',
            unreconciled_count: '3',
            supplier_clp: '5000000',
            payroll_clp: '0',
            fiscal_clp: '0',
            drift_count: '2'
          }
        ]
      })

      const summary = await sumExpensePaymentsClpForPeriod({
        fromDate: '2026-04-01',
        toDate: '2026-05-02'
      })

      expect(summary.driftCount).toBe(2)
    })

    it('accepts expense_type filter without throwing', async () => {
      queuedResults.push({ rows: [] })

      await expect(
        sumExpensePaymentsClpForPeriod({
          fromDate: '2026-04-01',
          toDate: '2026-05-02',
          expenseType: 'supplier'
        })
      ).resolves.toBeDefined()
    })

    it('accepts supplier_id filter without throwing', async () => {
      queuedResults.push({ rows: [] })

      await expect(
        sumExpensePaymentsClpForPeriod({
          fromDate: '2026-04-01',
          toDate: '2026-05-02',
          supplierId: 'sup-test-1'
        })
      ).resolves.toBeDefined()
    })

    it('accepts is_reconciled filter without throwing', async () => {
      queuedResults.push({ rows: [] })

      await expect(
        sumExpensePaymentsClpForPeriod({
          fromDate: '2026-04-01',
          toDate: '2026-05-02',
          isReconciled: false
        })
      ).resolves.toBeDefined()
    })

    it('rejects invalid date formats', async () => {
      await expect(
        sumExpensePaymentsClpForPeriod({ fromDate: '2026-4-1', toDate: '2026-05-02' })
      ).rejects.toBeInstanceOf(FinanceValidationError)
    })

    it('rejects fromDate > toDate', async () => {
      await expect(
        sumExpensePaymentsClpForPeriod({ fromDate: '2026-06-01', toDate: '2026-05-02' })
      ).rejects.toBeInstanceOf(FinanceValidationError)
    })

    it('returns zeros when no rows match', async () => {
      queuedResults.push({ rows: [] })

      const summary = await sumExpensePaymentsClpForPeriod({
        fromDate: '2026-04-01',
        toDate: '2026-05-02'
      })

      expect(summary).toEqual({
        totalClp: 0,
        totalPayments: 0,
        unreconciledCount: 0,
        supplierClp: 0,
        payrollClp: 0,
        fiscalClp: 0,
        driftCount: 0,
        byEconomicCategory: {
          labor_cost_internal: 0,
          labor_cost_external: 0,
          vendor_cost_saas: 0,
          vendor_cost_professional_services: 0,
          regulatory_payment: 0,
          tax: 0,
          financial_cost: 0,
          bank_fee_real: 0,
          overhead: 0,
          financial_settlement: 0,
          other: 0
        },
        economicCategoryUnresolvedCount: 0
      })
    })
  })

  describe('listExpensePaymentsNormalized', () => {
    it('returns paginated payments from the canonical VIEW', async () => {
      queuedResults.push({ rows: [{ total: '37' }] })
      queuedResults.push({
        rows: [
          {
            payment_id: 'exp-pay-sha-46679051-7ba82530',
            expense_id: 'EXP-SHA-46679051',
            payment_date: '2026-04-27',
            payment_amount_native: '1106321.00',
            payment_currency: 'CLP',
            payment_amount_clp: '1106321.00',
            exchange_rate_at_payment: null,
            fx_gain_loss_clp: '0',
            payment_account_id: 'sha-cca-julio-reyes-clp',
            payment_method: 'cca_reimbursement',
            payment_source: 'manual',
            is_reconciled: false,
            payment_order_line_id: null,
            reference: 'shareholder-reimbursement-46679051',
            recorded_at: '2026-04-27T12:00:00Z',
            created_at: '2026-04-27T12:00:00Z',
            has_clp_drift: false
          }
        ]
      })

      const result = await listExpensePaymentsNormalized({
        fromDate: '2026-04-01',
        toDate: '2026-05-02',
        page: 1,
        pageSize: 50
      })

      expect(result.total).toBe(37)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].paymentAmountClp).toBe(1_106_321)
      expect(result.items[0].paymentCurrency).toBe('CLP')
      expect(result.items[0].hasClpDrift).toBe(false)
      expect(executedSql[1]).toContain('greenhouse_finance.expense_payments_normalized')
    })

    it('exposes hasClpDrift=true when payment_amount_clp is NULL', async () => {
      queuedResults.push({ rows: [{ total: '1' }] })
      queuedResults.push({
        rows: [
          {
            payment_id: 'exp-pay-drift-1',
            expense_id: 'EXP-DRIFT-1',
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
            payment_order_line_id: null,
            reference: null,
            recorded_at: '2026-04-15T00:00:00Z',
            created_at: '2026-04-15T00:00:00Z',
            has_clp_drift: true
          }
        ]
      })

      const result = await listExpensePaymentsNormalized({
        fromDate: '2026-04-01',
        toDate: '2026-05-02'
      })

      expect(result.items[0].paymentAmountClp).toBeNull()
      expect(result.items[0].hasClpDrift).toBe(true)
    })

    it('clamps page and pageSize bounds', async () => {
      queuedResults.push({ rows: [{ total: '0' }] })
      queuedResults.push({ rows: [] })

      const result = await listExpensePaymentsNormalized({
        fromDate: '2026-04-01',
        toDate: '2026-05-02',
        page: -5,
        pageSize: 9999
      })

      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(200) // capped to 200
    })
  })

  describe('getExpensePaymentsClpDriftCount', () => {
    it('returns the count of has_clp_drift=TRUE rows', async () => {
      queuedResults.push({ rows: [{ drift_count: '5' }] })

      const count = await getExpensePaymentsClpDriftCount()

      expect(count).toBe(5)
      expect(executedSql[0]).toContain('expense_payments_normalized')
      expect(executedSql[0]).toContain('has_clp_drift = TRUE')
    })

    it('returns 0 when no drift detected', async () => {
      queuedResults.push({ rows: [{ drift_count: '0' }] })

      const count = await getExpensePaymentsClpDriftCount()

      expect(count).toBe(0)
    })
  })
})
