import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import {
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'
import {
  FinanceValidationError,
  normalizeString,
  resolveExchangeRateToClp,
  roundCurrency,
  toDateString,
  toNumber,
  toTimestampString,
  type FinanceCurrency
} from '@/lib/finance/shared'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

// ─── Types ──────────────────────────────────────────────────────────

type QueryableClient = Pick<PoolClient, 'query'>

type ExpensePaymentSource = 'manual' | 'payroll_system' | 'nubox_sync' | 'bank_statement'

export interface RecordExpensePaymentInput {
  expenseId: string
  paymentId?: string
  paymentDate: string
  amount: number
  currency?: string
  reference?: string | null
  paymentMethod?: string | null
  paymentAccountId?: string | null
  paymentSource?: ExpensePaymentSource
  notes?: string | null
  actorUserId?: string | null
  exchangeRateOverride?: number | null
}

export interface ExpensePaymentRecord {
  paymentId: string
  expenseId: string
  paymentDate: string | null
  amount: number
  currency: string | null
  reference: string | null
  paymentMethod: string | null
  paymentAccountId: string | null
  paymentSource: string
  notes: string | null
  recordedAt: string | null
  isReconciled: boolean
  reconciliationRowId: string | null
  reconciledAt: string | null
  createdAt: string | null
  exchangeRateAtPayment: number | null
  amountClp: number | null
  fxGainLossClp: number | null
}

export interface ReconcileExpensePaymentTotalsResult {
  expenseId: string
  totalAmount: number
  sumPayments: number
  amountPaid: number
  paymentStatus: string
  paymentCount: number
  isConsistent: boolean
  corrected: boolean
}

type PostgresExpensePaymentRow = {
  payment_id: string
  expense_id: string
  payment_date: string | Date | null
  amount: unknown
  currency: string | null
  reference: string | null
  payment_method: string | null
  payment_account_id: string | null
  payment_source: string
  notes: string | null
  recorded_at: string | Date | null
  is_reconciled: boolean
  reconciliation_row_id: string | null
  reconciled_at: string | Date | null
  created_at: string | Date | null
  exchange_rate_at_payment: unknown
  amount_clp: unknown
  fx_gain_loss_clp: unknown
}

// ─── Helpers ────────────────────────────────────────────────────────

const str = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  const s = normalizeString(v)

  return s || null
}

const queryRows = async <T extends Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
  client?: QueryableClient
) => {
  if (client) {
    const result = await client.query<T>(text, values)

    return result.rows
  }

  return runGreenhousePostgresQuery<T>(text, values)
}

const mapPaymentRow = (row: PostgresExpensePaymentRow): ExpensePaymentRecord => ({
  paymentId: normalizeString(row.payment_id),
  expenseId: normalizeString(row.expense_id),
  paymentDate: toDateString(row.payment_date as string | { value?: string } | null),
  amount: toNumber(row.amount),
  currency: str(row.currency),
  reference: str(row.reference),
  paymentMethod: str(row.payment_method),
  paymentAccountId: str(row.payment_account_id),
  paymentSource: normalizeString(row.payment_source) || 'manual',
  notes: str(row.notes),
  recordedAt: toTimestampString(row.recorded_at as string | { value?: string } | null),
  isReconciled: Boolean(row.is_reconciled),
  reconciliationRowId: str(row.reconciliation_row_id),
  reconciledAt: toTimestampString(row.reconciled_at as string | { value?: string } | null),
  createdAt: toTimestampString(row.created_at as string | { value?: string } | null),
  exchangeRateAtPayment: row.exchange_rate_at_payment != null ? toNumber(row.exchange_rate_at_payment) : null,
  amountClp: row.amount_clp != null ? toNumber(row.amount_clp) : null,
  fxGainLossClp: row.fx_gain_loss_clp != null ? toNumber(row.fx_gain_loss_clp) : null
})

const PAYMENT_COLUMNS = `
  payment_id, expense_id, payment_date, amount, currency, reference,
  payment_method, payment_account_id, payment_source, notes,
  recorded_at, is_reconciled, reconciliation_row_id, reconciled_at,
  created_at, exchange_rate_at_payment, amount_clp, fx_gain_loss_clp
`

// ─── recordExpensePayment ───────────────────────────────────────────

/**
 * Record a payment against an expense (purchase document).
 *
 * Creates a row in expense_payments. The DB trigger `trg_sync_expense_amount_paid`
 * automatically updates expenses.amount_paid and expenses.payment_status
 * as derived values from SUM(expense_payments.amount).
 *
 * If the trigger is not yet deployed, this function falls back to updating
 * expenses.amount_paid and payment_status manually (forward-compatible).
 *
 * Publishes outbox event: finance.expense_payment.recorded
 */
export async function recordExpensePayment(input: RecordExpensePaymentInput): Promise<{
  payment: ExpensePaymentRecord
  expenseId: string
  paymentStatus: string
  amountPaid: number
  amountPending: number
}> {
  const paymentId = input.paymentId || `exp-pay-${randomUUID()}`
  const paymentSource = input.paymentSource || 'manual'

  return withGreenhousePostgresTransaction(async (client: PoolClient) => {
    // Lock the expense row to prevent concurrent payment races
    const expenseRows = await queryRows<{
      expense_id: string
      currency: string
      total_amount: unknown
      amount_paid: unknown
      payment_status: string
      exchange_rate_to_clp: unknown
    }>(
      `SELECT expense_id, currency, total_amount, COALESCE(amount_paid, 0) AS amount_paid, payment_status, exchange_rate_to_clp
       FROM greenhouse_finance.expenses WHERE expense_id = $1 FOR UPDATE`,
      [input.expenseId],
      client
    )

    if (expenseRows.length === 0) {
      throw new FinanceValidationError('Expense record not found', 404)
    }

    const expense = expenseRows[0]
    const totalAmount = toNumber(expense.total_amount)
    const currentAmountPaid = toNumber(expense.amount_paid)
    const projectedAmountPaid = roundCurrency(currentAmountPaid + input.amount)

    if (projectedAmountPaid - totalAmount > 0.01) {
      throw new FinanceValidationError(
        `Payment amount (${input.amount}) exceeds pending balance (${roundCurrency(totalAmount - currentAmountPaid)}).`,
        409
      )
    }

    // Deduplication: if reference is provided, check for existing payment
    if (input.reference) {
      const existing = await queryRows<{ payment_id: string }>(
        `SELECT payment_id FROM greenhouse_finance.expense_payments
         WHERE expense_id = $1 AND reference = $2 LIMIT 1`,
        [input.expenseId, input.reference],
        client
      )

      if (existing.length > 0) {
        throw new FinanceValidationError(
          `Payment with reference "${input.reference}" already exists for this expense.`,
          409
        )
      }
    }

    // FX resolution: compute CLP equivalents for multi-currency payments
    const paymentCurrency = (input.currency || normalizeString(expense.currency) || 'CLP') as FinanceCurrency
    let exchangeRateAtPayment: number | null = null
    let amountClp: number | null = null
    let fxGainLossClp: number | null = null

    if (paymentCurrency === 'CLP') {
      exchangeRateAtPayment = 1
      amountClp = input.amount
      fxGainLossClp = 0
    } else {
      const rateAtPayment = await resolveExchangeRateToClp({
        currency: paymentCurrency,
        requestedRate: input.exchangeRateOverride
      })

      exchangeRateAtPayment = rateAtPayment
      amountClp = roundCurrency(input.amount * rateAtPayment)

      const documentRate = toNumber(expense.exchange_rate_to_clp)

      fxGainLossClp = documentRate > 0
        ? roundCurrency(amountClp - roundCurrency(input.amount * documentRate))
        : null
    }

    // Insert payment record
    const paymentRows = await queryRows<PostgresExpensePaymentRow>(
      `INSERT INTO greenhouse_finance.expense_payments (
        payment_id, expense_id, payment_date, amount, currency, reference,
        payment_method, payment_account_id, payment_source, notes,
        recorded_by_user_id, recorded_at, is_reconciled, created_at,
        exchange_rate_at_payment, amount_clp, fx_gain_loss_clp
      )
      VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, FALSE, CURRENT_TIMESTAMP, $12, $13, $14)
      RETURNING ${PAYMENT_COLUMNS}`,
      [
        paymentId,
        input.expenseId,
        input.paymentDate,
        input.amount,
        paymentCurrency,
        input.reference || null,
        input.paymentMethod || null,
        input.paymentAccountId || null,
        paymentSource,
        input.notes || null,
        input.actorUserId || null,
        exchangeRateAtPayment,
        amountClp,
        fxGainLossClp
      ],
      client
    )

    const payment = mapPaymentRow(paymentRows[0])

    // Re-derive for response (and as fallback if trigger absent)
    const sumResult = await queryRows<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS total
       FROM greenhouse_finance.expense_payments WHERE expense_id = $1`,
      [input.expenseId],
      client
    )

    const newAmountPaid = roundCurrency(toNumber(sumResult[0]?.total))
    const newStatus = newAmountPaid >= totalAmount ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending'

    // Fallback: ensure expense row is up to date (idempotent if trigger ran)
    await queryRows(
      `UPDATE greenhouse_finance.expenses SET
        amount_paid = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE expense_id = $1`,
      [input.expenseId, newAmountPaid, newStatus],
      client
    )

    // Publish outbox event
    await publishOutboxEvent(
      {
        aggregateType: 'finance_expense_payment',
        aggregateId: paymentId,
        eventType: 'finance.expense_payment.recorded',
        payload: {
          paymentId,
          expenseId: input.expenseId,
          paymentDate: input.paymentDate,
          amount: input.amount,
          paymentSource,
          reference: input.reference || null,
          paymentStatus: newStatus,
          amountPaid: newAmountPaid
        }
      },
      client
    )

    return {
      payment,
      expenseId: input.expenseId,
      paymentStatus: newStatus,
      amountPaid: newAmountPaid,
      amountPending: roundCurrency(totalAmount - newAmountPaid)
    }
  })
}

// ─── getPaymentsForExpense ──────────────────────────────────────────

/**
 * Retrieve all payment records for a given expense.
 * Ordered by payment_date DESC, created_at DESC.
 */
export async function getPaymentsForExpense(expenseId: string): Promise<{
  expenseId: string
  payments: ExpensePaymentRecord[]
  totalPaid: number
  paymentCount: number
}> {
  const paymentRows = await runGreenhousePostgresQuery<PostgresExpensePaymentRow>(
    `SELECT ${PAYMENT_COLUMNS}
     FROM greenhouse_finance.expense_payments
     WHERE expense_id = $1
     ORDER BY payment_date DESC, created_at DESC`,
    [expenseId]
  )

  const payments = paymentRows.map(mapPaymentRow)
  const totalPaid = roundCurrency(payments.reduce((sum, p) => sum + p.amount, 0))

  return {
    expenseId,
    payments,
    totalPaid,
    paymentCount: payments.length
  }
}

// ─── reconcileExpensePaymentTotals ──────────────────────────────────

/**
 * Compare expenses.amount_paid against SUM(expense_payments.amount) and
 * correct any drift. Returns the reconciliation result.
 */
export async function reconcileExpensePaymentTotals(expenseId: string): Promise<ReconcileExpensePaymentTotalsResult> {
  const expenseRows = await runGreenhousePostgresQuery<{
    expense_id: string
    total_amount: unknown
    amount_paid: unknown
    payment_status: string
  }>(
    `SELECT expense_id, total_amount, COALESCE(amount_paid, 0) AS amount_paid, payment_status
     FROM greenhouse_finance.expenses WHERE expense_id = $1`,
    [expenseId]
  )

  if (expenseRows.length === 0) {
    throw new FinanceValidationError('Expense record not found', 404)
  }

  const expense = expenseRows[0]
  const totalAmount = toNumber(expense.total_amount)
  const currentAmountPaid = toNumber(expense.amount_paid)

  const sumResult = await runGreenhousePostgresQuery<{ total: string; cnt: string }>(
    `SELECT COALESCE(SUM(amount), 0)::text AS total, COUNT(*)::text AS cnt
     FROM greenhouse_finance.expense_payments WHERE expense_id = $1`,
    [expenseId]
  )

  const sumPayments = roundCurrency(toNumber(sumResult[0]?.total))
  const paymentCount = Number(sumResult[0]?.cnt ?? 0)
  const isConsistent = Math.abs(currentAmountPaid - sumPayments) < 0.01

  let corrected = false

  if (!isConsistent) {
    const newStatus = sumPayments >= totalAmount ? 'paid' : sumPayments > 0 ? 'partial' : 'pending'

    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_finance.expenses SET
        amount_paid = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE expense_id = $1`,
      [expenseId, sumPayments, newStatus]
    )

    corrected = true
  }

  const finalStatus = sumPayments >= totalAmount ? 'paid' : sumPayments > 0 ? 'partial' : 'pending'

  return {
    expenseId,
    totalAmount,
    sumPayments,
    amountPaid: corrected ? sumPayments : currentAmountPaid,
    paymentStatus: finalStatus,
    paymentCount,
    isConsistent,
    corrected
  }
}
