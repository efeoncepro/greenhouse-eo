import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const executedSql: string[] = []
const queuedResults: Array<{ rows: Array<Record<string, unknown>> }> = []

const renderSql = (strings: TemplateStringsArray) =>
  strings.reduce((query, fragment, index) => `${query}${fragment}${index < strings.length - 1 ? `$${index + 1}` : ''}`, '')

vi.mock('kysely', () => ({
  sql: (strings: TemplateStringsArray) => ({
    execute: vi.fn(async () => {
      executedSql.push(renderSql(strings))

      return queuedResults.shift() ?? { rows: [] }
    })
  })
}))

vi.mock('@/lib/db', () => ({
  getDb: vi.fn(async () => ({}))
}))

import {
  countIncomesWithSettlementDrift,
  getIncomeSettlementBreakdown,
  listIncomesWithSettlementDrift
} from '@/lib/finance/income-settlement'

describe('income-settlement helper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    executedSql.length = 0
    queuedResults.length = 0
  })

  it('reads from the canonical reconciliation view (single source of truth)', async () => {
    queuedResults.push({ rows: [] })
    await getIncomeSettlementBreakdown('INC-NB-1')

    expect(executedSql[0]).toContain('greenhouse_finance.income_settlement_reconciliation')
    // Guardrail: the helper must NEVER manually re-derive the formula from
    // raw tables. If a future refactor inlines income_payments + factoring_operations
    // in the helper, this test fails.
    expect(executedSql[0]).not.toContain('FROM greenhouse_finance.income_payments')
    expect(executedSql[0]).not.toContain('FROM greenhouse_finance.factoring_operations')
  })

  it('maps the reconciliation row including factoring fees and withholdings', async () => {
    queuedResults.push({
      rows: [
        {
          income_id: 'INC-NB-27971848',
          invoice_number: '115',
          client_id: 'C-001',
          total_amount: '6902000.00',
          amount_paid: '6902000.00',
          payment_status: 'paid',
          payments_total: '6776453.00',
          factoring_fee_total: '125547.00',
          factoring_operation_count: 1,
          withholding_amount: '0.00',
          expected_settlement: '6902000.00',
          drift: '0.00',
          has_drift: false,
          is_factored: true
        }
      ]
    })

    const breakdown = await getIncomeSettlementBreakdown('INC-NB-27971848')

    expect(breakdown).toEqual({
      incomeId: 'INC-NB-27971848',
      invoiceNumber: '115',
      clientId: 'C-001',
      totalAmount: 6902000,
      amountPaid: 6902000,
      paymentStatus: 'paid',
      paymentsTotal: 6776453,
      factoringFeeTotal: 125547,
      factoringOperationCount: 1,
      withholdingAmount: 0,
      expectedSettlement: 6902000,
      drift: 0,
      hasDrift: false,
      isFactored: true
    })
  })

  it('reports drift when amount_paid does NOT match cash + factoring + withholding', async () => {
    queuedResults.push({
      rows: [
        {
          income_id: 'INC-DRIFT-1',
          invoice_number: '999',
          client_id: 'C-X',
          total_amount: '1000000',
          amount_paid: '900000',
          payment_status: 'partial',
          payments_total: '500000',
          factoring_fee_total: '0',
          factoring_operation_count: 0,
          withholding_amount: '0',
          expected_settlement: '500000',
          drift: '400000',
          has_drift: true,
          is_factored: false
        }
      ]
    })

    const breakdown = await getIncomeSettlementBreakdown('INC-DRIFT-1')

    expect(breakdown?.hasDrift).toBe(true)
    expect(breakdown?.drift).toBe(400000)
    expect(breakdown?.isFactored).toBe(false)
  })

  it('returns null when the income does not exist', async () => {
    queuedResults.push({ rows: [] })

    const breakdown = await getIncomeSettlementBreakdown('INC-NONEXISTENT')

    expect(breakdown).toBeNull()
  })

  it('listIncomesWithSettlementDrift sorts by absolute drift', async () => {
    queuedResults.push({ rows: [] })
    await listIncomesWithSettlementDrift({ limit: 5 })

    expect(executedSql[0]).toContain('greenhouse_finance.income_settlement_reconciliation')
    expect(executedSql[0]).toContain('WHERE has_drift = TRUE')
    expect(executedSql[0]).toContain('ORDER BY ABS(drift)')
  })

  it('countIncomesWithSettlementDrift returns 0 on empty result', async () => {
    queuedResults.push({ rows: [] })

    expect(await countIncomesWithSettlementDrift()).toBe(0)
  })

  it('countIncomesWithSettlementDrift parses string count correctly', async () => {
    queuedResults.push({ rows: [{ cnt: '7' }] })

    expect(await countIncomesWithSettlementDrift()).toBe(7)
  })
})
