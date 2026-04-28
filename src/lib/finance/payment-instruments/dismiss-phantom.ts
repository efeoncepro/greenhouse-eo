import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { FinanceValidationError } from '@/lib/finance/shared'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

/**
 * TASK-708b — Dismiss phantom payment without replacement.
 * =========================================================
 *
 * Patron complementario a `supersede{Income,Expense}Phantom` (TASK-702).
 *
 *   - supersede{Income,Expense}Phantom → reemplaza phantom con un payment canonico
 *     limpio (outcome `superseded_replaced` o `repaired_with_account`).
 *   - dismissPhantomPayment → marca phantom como anulado SIN replacement
 *     (outcome `dismissed_no_cash`: Nubox dijo "pagado" pero no hay cash real).
 *
 * Hard rules:
 *   - reason obligatorio (8+ caracteres, audit-grade).
 *   - cero DELETE: solo UPDATE de `superseded_at` + `superseded_reason`.
 *   - idempotente: si ya tiene `superseded_at` set, no-op (sin error).
 *   - Pre-requisito: la migracion task-708b-extend-amount-paid-triggers-include-superseded-at
 *     debe estar aplicada para que el SUM canonico excluya filas con
 *     `superseded_at NOT NULL` (independiente de superseded_by_payment_id).
 *   - emite outbox event `finance.{income,expense}.payment_dismissed_historical`.
 */

interface DismissPhantomInput {
  phantomPaymentId: string
  reason: string
  actorUserId?: string | null
}

const ensureReason = (reason: string): string => {
  const trimmed = (reason ?? '').trim()

  if (trimmed.length < 8) {
    throw new FinanceValidationError(
      'dismissPhantomPayment.reason debe tener al menos 8 caracteres.',
      422,
      { field: 'reason' },
      'DISMISS_REASON_TOO_SHORT'
    )
  }

  return trimmed
}

export const dismissIncomePhantom = async (
  input: DismissPhantomInput
): Promise<{ incomeId: string; alreadyDismissed: boolean; recomputed: number }> => {
  const reason = ensureReason(input.reason)

  return withTransaction(async (client: PoolClient) => {
    const phantomRow = await client.query<{
      payment_id: string
      income_id: string
      amount: string
      superseded_at: Date | null
      superseded_by_payment_id: string | null
    }>(
      `SELECT payment_id, income_id, amount, superseded_at, superseded_by_payment_id
       FROM greenhouse_finance.income_payments
       WHERE payment_id = $1
       FOR UPDATE`,
      [input.phantomPaymentId]
    )

    if (phantomRow.rows.length === 0) {
      throw new FinanceValidationError(
        `income_payment ${input.phantomPaymentId} not found for dismissal.`,
        404
      )
    }

    const phantom = phantomRow.rows[0]
    const alreadyDismissed = Boolean(phantom.superseded_at)

    // If the payment is already superseded but linked settlement_legs are NOT,
    // still run the cascade (backfill scenario). Otherwise the idempotent
    // re-call is a true no-op.
    if (!alreadyDismissed) {
      await client.query(
        `UPDATE greenhouse_finance.income_payments SET
           superseded_at = NOW(),
           superseded_reason = $1
         WHERE payment_id = $2`,
        [reason, input.phantomPaymentId]
      )
    }

    // Cascade-supersede linked settlement_legs. The materializer prefers
    // settlement_legs over fallback income_payments; without this cascade the
    // phantom inflow would still be counted by account_balances despite the
    // payment being superseded.
    const cascadedLegs = await client.query<{ settlement_leg_id: string }>(
      `UPDATE greenhouse_finance.settlement_legs SET
         superseded_at = NOW(),
         superseded_reason = $1
       WHERE linked_payment_type = 'income_payment'
         AND linked_payment_id = $2
         AND superseded_at IS NULL
       RETURNING settlement_leg_id`,
      [reason, input.phantomPaymentId]
    )

    if (alreadyDismissed && cascadedLegs.rows.length === 0) {
      // True no-op: payment already dismissed and no orphan legs to cascade.
      return { incomeId: phantom.income_id, alreadyDismissed: true, recomputed: -1 }
    }

    const recomputed = await client.query<{ result: string }>(
      `SELECT greenhouse_finance.fn_recompute_income_amount_paid($1) AS result`,
      [phantom.income_id]
    )

    await publishOutboxEvent(
      {
        aggregateType: 'finance.income',
        aggregateId: phantom.income_id,
        eventType: 'finance.income.payment_dismissed_historical',
        payload: {
          incomeId: phantom.income_id,
          phantomPaymentId: input.phantomPaymentId,
          cascadedSettlementLegIds: cascadedLegs.rows.map(row => row.settlement_leg_id),
          reason,
          actorUserId: input.actorUserId ?? null
        }
      },
      client
    )

    return {
      incomeId: phantom.income_id,
      alreadyDismissed: false,
      recomputed: Number(recomputed.rows[0]?.result ?? 0)
    }
  })
}

export const dismissExpensePhantom = async (
  input: DismissPhantomInput
): Promise<{ expenseId: string; alreadyDismissed: boolean }> => {
  const reason = ensureReason(input.reason)

  return withTransaction(async (client: PoolClient) => {
    const phantomRow = await client.query<{
      payment_id: string
      expense_id: string
      amount: string
      superseded_at: Date | null
    }>(
      `SELECT payment_id, expense_id, amount, superseded_at
       FROM greenhouse_finance.expense_payments
       WHERE payment_id = $1
       FOR UPDATE`,
      [input.phantomPaymentId]
    )

    if (phantomRow.rows.length === 0) {
      throw new FinanceValidationError(
        `expense_payment ${input.phantomPaymentId} not found for dismissal.`,
        404
      )
    }

    const phantom = phantomRow.rows[0]
    const alreadyDismissed = Boolean(phantom.superseded_at)

    if (!alreadyDismissed) {
      await client.query(
        `UPDATE greenhouse_finance.expense_payments SET
           superseded_at = NOW(),
           superseded_reason = $1
         WHERE payment_id = $2`,
        [reason, input.phantomPaymentId]
      )
    }

    // Cascade-supersede linked settlement_legs (same reasoning as income side).
    const cascadedLegs = await client.query<{ settlement_leg_id: string }>(
      `UPDATE greenhouse_finance.settlement_legs SET
         superseded_at = NOW(),
         superseded_reason = $1
       WHERE linked_payment_type = 'expense_payment'
         AND linked_payment_id = $2
         AND superseded_at IS NULL
       RETURNING settlement_leg_id`,
      [reason, input.phantomPaymentId]
    )

    if (alreadyDismissed && cascadedLegs.rows.length === 0) {
      return { expenseId: phantom.expense_id, alreadyDismissed: true }
    }

    await publishOutboxEvent(
      {
        aggregateType: 'finance.expense',
        aggregateId: phantom.expense_id,
        eventType: 'finance.expense.payment_dismissed_historical',
        payload: {
          expenseId: phantom.expense_id,
          phantomPaymentId: input.phantomPaymentId,
          cascadedSettlementLegIds: cascadedLegs.rows.map(row => row.settlement_leg_id),
          reason,
          actorUserId: input.actorUserId ?? null
        }
      },
      client
    )

    return { expenseId: phantom.expense_id, alreadyDismissed: false }
  })
}
