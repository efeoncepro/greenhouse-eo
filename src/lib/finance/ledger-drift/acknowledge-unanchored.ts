import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { FinanceValidationError } from '@/lib/finance/shared'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

/**
 * TASK-934 — Acknowledge an unanchored paid expense as known debt.
 * ================================================================
 *
 * A paid expense with NO FK anchor (payroll_entry_id / tool_catalog_id /
 * supplier_id / tax_type / loan_account_id / linked_income_id all NULL) but WITH
 * economic_category is classified for P&L; it just lacks a sub-ledger FK link.
 * For labor payments to people (Daniela España, Andrés/David Colombia, Valentina)
 * and regulatory/bank fees, a supplier_id would be a category error — the
 * canonical resolution is to ACCEPT them as known debt.
 *
 * Mirror of `dismiss-phantom.ts` BUT semantically distinct: the expense is NOT
 * voided/superseded — it stays in P&L. These columns only record the operator's
 * acceptance ("classified via economic_category, no FK anchor appropriate").
 *
 * Hard rules:
 *   - reason obligatorio (10+ chars, audit-grade).
 *   - solo aplica a gastos GENUINAMENTE unanchored + paid (defensivo: si el gasto
 *     tiene cualquier FK anchor, throw — no es un item unanchored).
 *   - idempotente: si ya tiene `unanchored_acknowledged_at`, no-op sin error.
 *   - cero DELETE / cero supersede: solo set de las 3 columnas acknowledgment.
 *   - emite outbox event `finance.expense.unanchored_acknowledged`.
 *   - capability gate (`finance.expenses.acknowledge_unanchored`) se valida en el
 *     route handler ANTES de invocar este helper (defense in depth).
 */

interface AcknowledgeUnanchoredInput {
  expenseId: string
  reason: string
  actorUserId?: string | null
}

const ensureReason = (reason: string): string => {
  const trimmed = (reason ?? '').trim()

  if (trimmed.length < 10) {
    throw new FinanceValidationError(
      'acknowledgeUnanchoredExpense.reason debe tener al menos 10 caracteres.',
      422,
      { field: 'reason' },
      'ACKNOWLEDGE_REASON_TOO_SHORT'
    )
  }

  return trimmed
}

export const acknowledgeUnanchoredExpense = async (
  input: AcknowledgeUnanchoredInput
): Promise<{ expenseId: string; alreadyAcknowledged: boolean }> => {
  const reason = ensureReason(input.reason)

  return withTransaction(async (client: PoolClient) => {
    const expenseRow = await client.query<{
      expense_id: string
      payment_status: string
      economic_category: string | null
      payroll_entry_id: string | null
      tool_catalog_id: string | null
      supplier_id: string | null
      tax_type: string | null
      loan_account_id: string | null
      linked_income_id: string | null
      unanchored_acknowledged_at: Date | null
    }>(
      `SELECT expense_id, payment_status, economic_category,
              payroll_entry_id, tool_catalog_id, supplier_id, tax_type,
              loan_account_id, linked_income_id, unanchored_acknowledged_at
       FROM greenhouse_finance.expenses
       WHERE expense_id = $1
       FOR UPDATE`,
      [input.expenseId]
    )

    if (expenseRow.rows.length === 0) {
      throw new FinanceValidationError(
        `expense ${input.expenseId} not found for acknowledgment.`,
        404
      )
    }

    const expense = expenseRow.rows[0]

    // Idempotent: already acknowledged → true no-op.
    if (expense.unanchored_acknowledged_at) {
      return { expenseId: expense.expense_id, alreadyAcknowledged: true }
    }

    // Defensive: only genuinely unanchored paid expenses can be acknowledged.
    if (expense.payment_status !== 'paid') {
      throw new FinanceValidationError(
        `expense ${input.expenseId} no está pagado (payment_status=${expense.payment_status}); el acknowledgment es solo para gastos pagados sin anchor.`,
        422,
        { field: 'payment_status' },
        'ACKNOWLEDGE_NOT_PAID'
      )
    }

    const hasAnchor =
      Boolean(expense.payroll_entry_id) ||
      Boolean(expense.tool_catalog_id) ||
      Boolean(expense.supplier_id) ||
      Boolean(expense.tax_type) ||
      Boolean(expense.loan_account_id) ||
      Boolean(expense.linked_income_id)

    if (hasAnchor) {
      throw new FinanceValidationError(
        `expense ${input.expenseId} ya tiene un FK-anchor; no es un gasto unanchored. Para corregir su clasificación usa el flujo de edición canónico.`,
        422,
        { field: 'anchor' },
        'ACKNOWLEDGE_ALREADY_ANCHORED'
      )
    }

    await client.query(
      `UPDATE greenhouse_finance.expenses SET
         unanchored_acknowledged_at = NOW(),
         unanchored_acknowledged_by = $1,
         unanchored_acknowledged_reason = $2,
         updated_at = NOW()
       WHERE expense_id = $3`,
      [input.actorUserId ?? null, reason, input.expenseId]
    )

    await publishOutboxEvent(
      {
        aggregateType: 'finance.expense',
        aggregateId: expense.expense_id,
        eventType: 'finance.expense.unanchored_acknowledged',
        payload: {
          expenseId: expense.expense_id,
          economicCategory: expense.economic_category,
          reason,
          actorUserId: input.actorUserId ?? null,
          acknowledgedAt: new Date().toISOString()
        }
      },
      client
    )

    return { expenseId: expense.expense_id, alreadyAcknowledged: false }
  })
}
