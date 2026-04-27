import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { FinanceValidationError } from '@/lib/finance/shared'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

/**
 * Supersede helpers — anti double-counting (TASK-702).
 * =====================================================
 *
 * Cuando un phantom Nubox-generated coexiste con el payment canónico
 * (factoring_proceeds, payroll, manual recorded, etc.), NO se elimina por
 * DELETE — se marca con `superseded_by_payment_id` para preservar audit.
 *
 * El trigger `fn_sync_expense_amount_paid` y la función
 * `fn_recompute_income_amount_paid` excluyen filas superseded del SUM,
 * así `expense.amount_paid` / `income.amount_paid` reflejan la verdad
 * canónica sin double-counting.
 *
 * Reglas:
 *   - Solo se puede supersede entre payments del mismo income_id /
 *     expense_id. Validado aquí.
 *   - El reason es obligatorio (mínimo 8 chars, mismo umbral que reason
 *     de updates). Queda en audit.
 *   - Idempotente: re-marcar un payment ya superseded con el mismo
 *     replacement no-op.
 */

interface SupersedeIncomePhantomInput {
  phantomPaymentId: string
  replacementPaymentId: string
  reason: string
  actorUserId?: string | null
}

interface SupersedeExpensePhantomInput {
  phantomPaymentId: string
  replacementPaymentId: string
  reason: string
  actorUserId?: string | null
}

const ensureReason = (reason: string): string => {
  const trimmed = (reason ?? '').trim()

  if (trimmed.length < 8) {
    throw new FinanceValidationError(
      'supersede.reason debe explicar el motivo con al menos 8 caracteres.',
      422,
      { field: 'reason' },
      'SUPERSEDE_REASON_TOO_SHORT'
    )
  }

  return trimmed
}

export const supersedeIncomePhantom = async (
  input: SupersedeIncomePhantomInput
): Promise<{ incomeId: string; recomputed: number }> => {
  const reason = ensureReason(input.reason)

  return withTransaction(async (client: PoolClient) => {
    const phantomRow = await client.query<{
      payment_id: string
      income_id: string
      amount: string
      superseded_by_payment_id: string | null
    }>(
      `SELECT payment_id, income_id, amount, superseded_by_payment_id
       FROM greenhouse_finance.income_payments
       WHERE payment_id = $1
       FOR UPDATE`,
      [input.phantomPaymentId]
    )

    if (phantomRow.rows.length === 0) {
      throw new FinanceValidationError(
        `income_payment ${input.phantomPaymentId} not found for supersede.`,
        404
      )
    }

    const phantom = phantomRow.rows[0]

    if (
      phantom.superseded_by_payment_id &&
      phantom.superseded_by_payment_id === input.replacementPaymentId
    ) {
      return { incomeId: phantom.income_id, recomputed: -1 }
    }

    const replacementRow = await client.query<{ payment_id: string; income_id: string }>(
      `SELECT payment_id, income_id FROM greenhouse_finance.income_payments WHERE payment_id = $1`,
      [input.replacementPaymentId]
    )

    if (replacementRow.rows.length === 0) {
      throw new FinanceValidationError(
        `replacement income_payment ${input.replacementPaymentId} not found.`,
        404
      )
    }

    if (replacementRow.rows[0].income_id !== phantom.income_id) {
      throw new FinanceValidationError(
        `Cannot supersede across different income_ids (phantom=${phantom.income_id} vs replacement=${replacementRow.rows[0].income_id}).`,
        422,
        undefined,
        'SUPERSEDE_INCOME_ID_MISMATCH'
      )
    }

    await client.query(
      `UPDATE greenhouse_finance.income_payments SET
         superseded_by_payment_id = $1,
         superseded_at = NOW(),
         superseded_reason = $2,
         updated_at = NOW()
       WHERE payment_id = $3`,
      [input.replacementPaymentId, reason, input.phantomPaymentId]
    )

    const recomputed = await client.query<{ result: string }>(
      `SELECT greenhouse_finance.fn_recompute_income_amount_paid($1) AS result`,
      [phantom.income_id]
    )

    await publishOutboxEvent(
      {
        aggregateType: 'finance.income',
        aggregateId: phantom.income_id,
        eventType: 'finance.income.payment_superseded',
        payload: {
          incomeId: phantom.income_id,
          phantomPaymentId: input.phantomPaymentId,
          replacementPaymentId: input.replacementPaymentId,
          reason,
          actorUserId: input.actorUserId ?? null
        }
      },
      client
    )

    return {
      incomeId: phantom.income_id,
      recomputed: Number(recomputed.rows[0]?.result ?? 0)
    }
  })
}

export const supersedeExpensePhantom = async (
  input: SupersedeExpensePhantomInput
): Promise<{ expenseId: string }> => {
  const reason = ensureReason(input.reason)

  return withTransaction(async (client: PoolClient) => {
    const phantomRow = await client.query<{
      payment_id: string
      expense_id: string
      amount: string
      superseded_by_payment_id: string | null
    }>(
      `SELECT payment_id, expense_id, amount, superseded_by_payment_id
       FROM greenhouse_finance.expense_payments
       WHERE payment_id = $1
       FOR UPDATE`,
      [input.phantomPaymentId]
    )

    if (phantomRow.rows.length === 0) {
      throw new FinanceValidationError(
        `expense_payment ${input.phantomPaymentId} not found for supersede.`,
        404
      )
    }

    const phantom = phantomRow.rows[0]

    if (
      phantom.superseded_by_payment_id &&
      phantom.superseded_by_payment_id === input.replacementPaymentId
    ) {
      return { expenseId: phantom.expense_id }
    }

    const replacementRow = await client.query<{ payment_id: string; expense_id: string }>(
      `SELECT payment_id, expense_id FROM greenhouse_finance.expense_payments WHERE payment_id = $1`,
      [input.replacementPaymentId]
    )

    if (replacementRow.rows.length === 0) {
      throw new FinanceValidationError(
        `replacement expense_payment ${input.replacementPaymentId} not found.`,
        404
      )
    }

    if (replacementRow.rows[0].expense_id !== phantom.expense_id) {
      throw new FinanceValidationError(
        `Cannot supersede across different expense_ids (phantom=${phantom.expense_id} vs replacement=${replacementRow.rows[0].expense_id}).`,
        422,
        undefined,
        'SUPERSEDE_EXPENSE_ID_MISMATCH'
      )
    }

    await client.query(
      `UPDATE greenhouse_finance.expense_payments SET
         superseded_by_payment_id = $1,
         superseded_at = NOW(),
         superseded_reason = $2,
         updated_at = NOW()
       WHERE payment_id = $3`,
      [input.replacementPaymentId, reason, input.phantomPaymentId]
    )

    // Trigger fn_sync_expense_amount_paid runs automatically on UPDATE,
    // so expense.amount_paid recomputes excluding the now-superseded row.

    await publishOutboxEvent(
      {
        aggregateType: 'finance.expense',
        aggregateId: phantom.expense_id,
        eventType: 'finance.expense.payment_superseded',
        payload: {
          expenseId: phantom.expense_id,
          phantomPaymentId: input.phantomPaymentId,
          replacementPaymentId: input.replacementPaymentId,
          reason,
          actorUserId: input.actorUserId ?? null
        }
      },
      client
    )

    return { expenseId: phantom.expense_id }
  })
}

/**
 * Convenience: list all current Nubox phantoms (income_payments with
 * payment_account_id IS NULL AND payment_source = 'nubox_bank_sync')
 * that have NOT been superseded yet. Used by the preflight report and
 * by the admin/finance/ledger-health endpoint.
 */
export const listUnsupersededIncomePhantoms = async () => {
  return runGreenhousePostgresQuery<{
    payment_id: string
    income_id: string
    payment_date: string
    amount: string
    reference: string | null
  }>(
    `SELECT payment_id, income_id, payment_date::text, amount::text, reference
     FROM greenhouse_finance.income_payments
     WHERE payment_account_id IS NULL
       AND payment_source = 'nubox_bank_sync'
       AND superseded_by_payment_id IS NULL
     ORDER BY payment_date DESC`
  )
}
