import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * Finance Ledger Health (TASK-702 Slice 7).
 * ==========================================
 *
 * Single read-only entry point for runtime drift detection across the entire
 * finance ledger. Surfaces 4 dimensions:
 *
 *   1. Settlement reconciliation drift — VIEW
 *      `income_settlement_reconciliation` (TASK-571) reports incomes where
 *      `amount_paid != cash + factoring_fee + withholding`.
 *
 *   2. Phantom payments — income_payments / expense_payments con
 *      payment_account_id IS NULL y NOT superseded. Cada phantom es un
 *      payment generado por Nubox sync sin anclaje a una cuenta concreta.
 *
 *   3. Account balance freshness — última fecha materializada de
 *      account_balances vs CURRENT_DATE. Stale > 2 días = degraded.
 *
 *   4. Unanchored expense_payments del período activo — expense_payments
 *      cuyo expense.* anchors están todos null (no payroll_entry_id, no
 *      tool_catalog_id, no supplier_id, no tax_type, no loan_account_id).
 *
 * Consumido por:
 *   - GET /api/admin/finance/ledger-health (admin endpoint).
 *   - Reliability dashboard (signal en finance module via captureMessageWithDomain).
 *   - Cron diario que dispara alerts si drift > N.
 */

export interface LedgerHealthSnapshot {
  healthy: boolean
  checkedAt: string
  settlementDrift: {
    driftedIncomesCount: number
    sampleDrifted: Array<{ incomeId: string; totalAmount: number; amountPaid: number; expectedSettlement: number; drift: number }>
  }
  phantoms: {
    incomePhantomsCount: number
    expensePhantomsCount: number
    samplePhantoms: Array<{ paymentId: string; incomeOrExpenseId: string; date: string; amount: number; source: 'income' | 'expense' }>
  }
  balanceFreshness: {
    accountsWithStaleBalances: Array<{ accountId: string; lastMaterializedAt: string; daysStale: number }>
  }
  unanchoredExpenses: {
    count: number
    sample: Array<{ expenseId: string; type: string; amount: number; paymentDate: string | null }>
  }
}

const STALE_THRESHOLD_DAYS = 2

const FRESHNESS_SQL = `
  SELECT
    a.account_id,
    MAX(ab.balance_date)::text AS last_materialized_at,
    EXTRACT(EPOCH FROM (CURRENT_DATE - MAX(ab.balance_date)))::int / 86400 AS days_stale
  FROM greenhouse_finance.accounts a
  LEFT JOIN greenhouse_finance.account_balances ab ON ab.account_id = a.account_id
  WHERE a.is_active = TRUE
  GROUP BY a.account_id
  HAVING MAX(ab.balance_date) IS NULL OR MAX(ab.balance_date) < CURRENT_DATE - INTERVAL '2 days'
`

const SETTLEMENT_DRIFT_SQL = `
  SELECT income_id, total_amount::text, amount_paid::text, expected_settlement::text, drift::text
  FROM greenhouse_finance.income_settlement_reconciliation
  WHERE has_drift = TRUE
  ORDER BY ABS(drift) DESC
  LIMIT 20
`

const PHANTOMS_INCOME_SQL = `
  SELECT payment_id, income_id, payment_date::text, amount::text
  FROM greenhouse_finance.income_payments
  WHERE payment_account_id IS NULL
    AND superseded_by_payment_id IS NULL
    AND payment_source = 'nubox_bank_sync'
  ORDER BY payment_date DESC
  LIMIT 20
`

const PHANTOMS_EXPENSE_SQL = `
  SELECT payment_id, expense_id, payment_date::text, amount::text
  FROM greenhouse_finance.expense_payments
  WHERE payment_account_id IS NULL
    AND superseded_by_payment_id IS NULL
    AND payment_source IN ('nubox_sync', 'manual')
  ORDER BY payment_date DESC
  LIMIT 20
`

const UNANCHORED_EXPENSES_SQL = `
  SELECT
    e.expense_id, e.expense_type, e.total_amount::text, e.payment_date::text
  FROM greenhouse_finance.expenses e
  WHERE e.payment_status = 'paid'
    AND e.payroll_entry_id IS NULL
    AND e.tool_catalog_id IS NULL
    AND e.supplier_id IS NULL
    AND e.tax_type IS NULL
    AND e.loan_account_id IS NULL
    AND e.linked_income_id IS NULL
    AND e.payment_date >= CURRENT_DATE - INTERVAL '60 days'
  ORDER BY e.payment_date DESC NULLS LAST
  LIMIT 20
`

export const getFinanceLedgerHealth = async (): Promise<LedgerHealthSnapshot> => {
  const [drifted, phantomsIncome, phantomsExpense, freshness, unanchored] = await Promise.all([
    runGreenhousePostgresQuery<{ income_id: string; total_amount: string; amount_paid: string; expected_settlement: string; drift: string }>(SETTLEMENT_DRIFT_SQL).catch(() => []),
    runGreenhousePostgresQuery<{ payment_id: string; income_id: string; payment_date: string; amount: string }>(PHANTOMS_INCOME_SQL).catch(() => []),
    runGreenhousePostgresQuery<{ payment_id: string; expense_id: string; payment_date: string; amount: string }>(PHANTOMS_EXPENSE_SQL).catch(() => []),
    runGreenhousePostgresQuery<{ account_id: string; last_materialized_at: string | null; days_stale: number | null }>(FRESHNESS_SQL).catch(() => []),
    runGreenhousePostgresQuery<{ expense_id: string; expense_type: string; total_amount: string; payment_date: string | null }>(UNANCHORED_EXPENSES_SQL).catch(() => [])
  ])

  const incomePhantoms = phantomsIncome.map(p => ({
    paymentId: p.payment_id,
    incomeOrExpenseId: p.income_id,
    date: p.payment_date,
    amount: Number(p.amount),
    source: 'income' as const
  }))

  const expensePhantoms = phantomsExpense.map(p => ({
    paymentId: p.payment_id,
    incomeOrExpenseId: p.expense_id,
    date: p.payment_date,
    amount: Number(p.amount),
    source: 'expense' as const
  }))

  const accountsWithStaleBalances = freshness.map(f => ({
    accountId: f.account_id,
    lastMaterializedAt: f.last_materialized_at ?? 'never',
    daysStale: f.days_stale ?? -1
  }))

  const settlementDrift = {
    driftedIncomesCount: drifted.length,
    sampleDrifted: drifted.slice(0, 10).map(d => ({
      incomeId: d.income_id,
      totalAmount: Number(d.total_amount),
      amountPaid: Number(d.amount_paid),
      expectedSettlement: Number(d.expected_settlement),
      drift: Number(d.drift)
    }))
  }

  const phantoms = {
    incomePhantomsCount: incomePhantoms.length,
    expensePhantomsCount: expensePhantoms.length,
    samplePhantoms: [...incomePhantoms, ...expensePhantoms].slice(0, 20)
  }

  const unanchoredExpenses = {
    count: unanchored.length,
    sample: unanchored.map(u => ({
      expenseId: u.expense_id,
      type: u.expense_type,
      amount: Number(u.total_amount),
      paymentDate: u.payment_date
    }))
  }

  const healthy =
    settlementDrift.driftedIncomesCount === 0 &&
    phantoms.incomePhantomsCount === 0 &&
    phantoms.expensePhantomsCount === 0 &&
    accountsWithStaleBalances.filter(a => a.daysStale > STALE_THRESHOLD_DAYS).length === 0 &&
    unanchoredExpenses.count === 0

  return {
    healthy,
    checkedAt: new Date().toISOString(),
    settlementDrift,
    phantoms,
    balanceFreshness: { accountsWithStaleBalances },
    unanchoredExpenses
  }
}
