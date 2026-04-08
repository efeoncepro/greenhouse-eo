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
import { ensureSettlementForIncomePayment } from '@/lib/finance/settlement-orchestration'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

// ─── Types ──────────────────────────────────────────────────────────

type QueryableClient = Pick<PoolClient, 'query'>

type PaymentSource = 'client_direct' | 'factoring_proceeds' | 'nubox_bank_sync'

export interface RecordPaymentInput {
  incomeId: string
  paymentId?: string
  paymentDate: string
  amount: number
  currency?: string
  reference?: string | null
  paymentMethod?: string | null
  paymentAccountId?: string | null
  paymentSource?: PaymentSource
  notes?: string | null
  actorUserId?: string | null
  exchangeRateOverride?: number | null
}

export interface IncomePaymentRecord {
  paymentId: string
  incomeId: string
  settlementGroupId?: string | null
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

export interface ReconcilePaymentTotalsResult {
  incomeId: string
  totalAmount: number
  sumPayments: number
  amountPaid: number
  paymentStatus: string
  paymentCount: number
  isConsistent: boolean
  corrected: boolean
}

type PostgresIncomePaymentRow = {
  payment_id: string
  income_id: string
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
  settlement_group_id: string | null
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

const mapPaymentRow = (row: PostgresIncomePaymentRow): IncomePaymentRecord => ({
  paymentId: normalizeString(row.payment_id),
  incomeId: normalizeString(row.income_id),
  settlementGroupId: str((row as PostgresIncomePaymentRow & { settlement_group_id?: string | null }).settlement_group_id),
  paymentDate: toDateString(row.payment_date as string | { value?: string } | null),
  amount: toNumber(row.amount),
  currency: str(row.currency),
  reference: str(row.reference),
  paymentMethod: str(row.payment_method),
  paymentAccountId: str(row.payment_account_id),
  paymentSource: normalizeString(row.payment_source) || 'client_direct',
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
  payment_id, income_id, payment_date, amount, currency, reference,
  payment_method, payment_account_id, payment_source, notes,
  recorded_at, is_reconciled, reconciliation_row_id, reconciled_at,
  created_at, exchange_rate_at_payment, amount_clp, fx_gain_loss_clp, settlement_group_id
`

// ─── recordPayment ──────────────────────────────────────────────────

/**
 * Record a payment against an invoice (income record).
 *
 * Creates a row in income_payments. The DB trigger `trg_sync_income_amount_paid`
 * will automatically update income.amount_paid and income.payment_status
 * as derived values from SUM(income_payments.amount).
 *
 * If the trigger is not yet deployed, this function falls back to updating
 * income.amount_paid and payment_status manually (forward-compatible).
 *
 * Publishes outbox event: finance.income_payment.recorded
 */
export async function recordPayment(input: RecordPaymentInput): Promise<{
  payment: IncomePaymentRecord
  incomeId: string
  paymentStatus: string
  amountPaid: number
  amountPending: number
}> {
  const paymentId = input.paymentId || `pay-${randomUUID()}`
  const paymentSource = input.paymentSource || 'client_direct'

  return withGreenhousePostgresTransaction(async (client: PoolClient) => {
    // Lock the income row for update to prevent concurrent payment races
    const incomeRows = await queryRows<{
      income_id: string
      currency: string
      total_amount: unknown
      amount_paid: unknown
      payment_status: string
      exchange_rate_to_clp: unknown
    }>(
      `SELECT income_id, currency, total_amount, amount_paid, payment_status, exchange_rate_to_clp
       FROM greenhouse_finance.income WHERE income_id = $1 FOR UPDATE`,
      [input.incomeId],
      client
    )

    if (incomeRows.length === 0) {
      throw new FinanceValidationError('Income record not found', 404)
    }

    const income = incomeRows[0]
    const totalAmount = toNumber(income.total_amount)
    const currentAmountPaid = toNumber(income.amount_paid)
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
        `SELECT payment_id FROM greenhouse_finance.income_payments
         WHERE income_id = $1 AND reference = $2 LIMIT 1`,
        [input.incomeId, input.reference],
        client
      )

      if (existing.length > 0) {
        throw new FinanceValidationError(
          `Payment with reference "${input.reference}" already exists for this invoice.`,
          409
        )
      }
    }

    // FX resolution: compute CLP equivalents for multi-currency payments
    const paymentCurrency = (input.currency || normalizeString(income.currency) || 'CLP') as FinanceCurrency
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

      const documentRate = toNumber(income.exchange_rate_to_clp)

      fxGainLossClp = documentRate > 0
        ? roundCurrency(amountClp - roundCurrency(input.amount * documentRate))
        : null
    }

    // Insert payment record
    const paymentRows = await queryRows<PostgresIncomePaymentRow>(
      `INSERT INTO greenhouse_finance.income_payments (
        payment_id, income_id, payment_date, amount, currency, reference,
        payment_method, payment_account_id, payment_source, notes,
        recorded_by_user_id, recorded_at, is_reconciled, created_at,
        exchange_rate_at_payment, amount_clp, fx_gain_loss_clp
      )
      VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, FALSE, CURRENT_TIMESTAMP, $12, $13, $14)
      RETURNING ${PAYMENT_COLUMNS}`,
      [
        paymentId,
        input.incomeId,
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

    const settlement = await ensureSettlementForIncomePayment({
      client,
      paymentId,
      paymentAccountId: input.paymentAccountId || null,
      paymentDate: input.paymentDate,
      amount: input.amount,
      currency: paymentCurrency,
      amountClp,
      exchangeRate: exchangeRateAtPayment,
      providerReference: input.reference || null,
      actorUserId: input.actorUserId || null,
      paymentSource
    })

    payment.settlementGroupId = settlement.settlementGroup.settlementGroupId

    // The trigger should have already updated income.amount_paid, but we
    // re-derive here for the response (and as a fallback if trigger is absent)
    const sumResult = await queryRows<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS total
       FROM greenhouse_finance.income_payments WHERE income_id = $1`,
      [input.incomeId],
      client
    )

    const newAmountPaid = roundCurrency(toNumber(sumResult[0]?.total))
    const newStatus = newAmountPaid >= totalAmount ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending'

    // Fallback: ensure income row is up to date (idempotent if trigger ran)
    await queryRows(
      `UPDATE greenhouse_finance.income SET
        amount_paid = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE income_id = $1`,
      [input.incomeId, newAmountPaid, newStatus],
      client
    )

    // Publish outbox event
    await publishOutboxEvent(
      {
        aggregateType: 'finance_income_payment',
        aggregateId: paymentId,
        eventType: 'finance.income_payment.recorded',
        payload: {
          paymentId,
          incomeId: input.incomeId,
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
      incomeId: input.incomeId,
      paymentStatus: newStatus,
      amountPaid: newAmountPaid,
      amountPending: roundCurrency(totalAmount - newAmountPaid)
    }
  })
}

// ─── getPaymentsForIncome ───────────────────────────────────────────

/**
 * Retrieve all payment records for a given income (invoice).
 * Ordered by payment_date DESC, created_at DESC.
 */
export async function getPaymentsForIncome(incomeId: string): Promise<{
  incomeId: string
  payments: IncomePaymentRecord[]
  totalPaid: number
  paymentCount: number
}> {
  const paymentRows = await runGreenhousePostgresQuery<PostgresIncomePaymentRow>(
    `SELECT ${PAYMENT_COLUMNS}
     FROM greenhouse_finance.income_payments
     WHERE income_id = $1
     ORDER BY payment_date DESC, created_at DESC`,
    [incomeId]
  )

  const payments = paymentRows.map(mapPaymentRow)
  const totalPaid = roundCurrency(payments.reduce((sum, p) => sum + p.amount, 0))

  return {
    incomeId,
    payments,
    totalPaid,
    paymentCount: payments.length
  }
}

// ─── reconcilePaymentTotals ─────────────────────────────────────────

/**
 * Compare income.amount_paid against SUM(income_payments.amount) and
 * correct any drift. Returns the reconciliation result.
 *
 * This is a consistency check: if the trigger is active, the values should
 * already be in sync. If they diverge (e.g., due to direct UPDATE bypassing
 * the trigger), this function corrects them.
 */
export async function reconcilePaymentTotals(incomeId: string): Promise<ReconcilePaymentTotalsResult> {
  const incomeRows = await runGreenhousePostgresQuery<{
    income_id: string
    total_amount: unknown
    amount_paid: unknown
    payment_status: string
  }>(
    `SELECT income_id, total_amount, amount_paid, payment_status
     FROM greenhouse_finance.income WHERE income_id = $1`,
    [incomeId]
  )

  if (incomeRows.length === 0) {
    throw new FinanceValidationError('Income record not found', 404)
  }

  const income = incomeRows[0]
  const totalAmount = toNumber(income.total_amount)
  const currentAmountPaid = toNumber(income.amount_paid)

  const sumResult = await runGreenhousePostgresQuery<{ total: string; cnt: string }>(
    `SELECT COALESCE(SUM(amount), 0)::text AS total, COUNT(*)::text AS cnt
     FROM greenhouse_finance.income_payments WHERE income_id = $1`,
    [incomeId]
  )

  const sumPayments = roundCurrency(toNumber(sumResult[0]?.total))
  const paymentCount = Number(sumResult[0]?.cnt ?? 0)
  const isConsistent = Math.abs(currentAmountPaid - sumPayments) < 0.01

  let corrected = false

  if (!isConsistent) {
    const newStatus = sumPayments >= totalAmount ? 'paid' : sumPayments > 0 ? 'partial' : 'pending'

    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_finance.income SET
        amount_paid = $2, payment_status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE income_id = $1`,
      [incomeId, sumPayments, newStatus]
    )

    corrected = true
  }

  const finalStatus = sumPayments >= totalAmount ? 'paid' : sumPayments > 0 ? 'partial' : 'pending'

  return {
    incomeId,
    totalAmount,
    sumPayments,
    amountPaid: corrected ? sumPayments : currentAmountPaid,
    paymentStatus: finalStatus,
    paymentCount,
    isConsistent,
    corrected
  }
}
