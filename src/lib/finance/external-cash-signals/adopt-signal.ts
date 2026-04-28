import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { recordPayment } from '@/lib/finance/payment-ledger'
import { recordExpensePayment } from '@/lib/finance/expense-payment-ledger'
import { FinanceValidationError } from '@/lib/finance/shared'

import type { AccountId } from '@/lib/finance/types/account-id'
import { parseAccountId } from '@/lib/finance/types/account-id'

import type { ExternalCashSignal, ExternalCashSignalResolutionMethod } from './types'

interface AdoptSignalManuallyInput {
  signalId: string
  accountId: string
  actorUserId: string
  notes?: string | null
}

export interface AdoptSignalManuallyResult {
  signalId: string
  promotedPaymentKind: 'income_payment' | 'expense_payment'
  promotedPaymentId: string
  resolvedAccountId: AccountId
}

interface RawSignalRow {
  signal_id: string
  source_system: string
  source_event_id: string
  document_kind: 'income' | 'expense' | 'unknown'
  document_id: string | null
  signal_date: string | Date
  amount: string
  currency: string
  account_resolution_status: ExternalCashSignal['accountResolutionStatus']
  promoted_payment_id: string | null
  space_id: string
}

/**
 * TASK-708 D3 — Adopcion manual con capability finance.cash.adopt-external-signal.
 *
 * Reglas duras:
 *   - signal debe estar en estado adoptable (unresolved/resolved_*); rechazar si
 *     ya fue `adopted`, `superseded` o `dismissed`.
 *   - debe tener `document_id` resuelto: la cuenta canonica solo puede crearse
 *     contra un income/expense real.
 *   - accountId se valida via `parseAccountId` (existe en greenhouse_finance.accounts).
 *   - todo en una transaccion: crear payment canonico + UPDATE signal a `adopted`
 *     con `promoted_payment_id` apuntando al payment recien creado. Si algo falla,
 *     rollback completo.
 *   - el trigger D4 (`fn_enforce_promoted_payment_invariant`) valida la
 *     consistencia automaticamente.
 */
export const adoptSignalManually = async (
  input: AdoptSignalManuallyInput
): Promise<AdoptSignalManuallyResult> => {
  const accountId = await parseAccountId(input.accountId)

  return withGreenhousePostgresTransaction(async client => {
    const lockedRows = await client.query<RawSignalRow>(
      `
        SELECT signal_id, source_system, source_event_id, document_kind, document_id,
               signal_date, amount, currency, account_resolution_status,
               promoted_payment_id, space_id
        FROM greenhouse_finance.external_cash_signals
        WHERE signal_id = $1
        FOR UPDATE
      `,
      [input.signalId]
    )

    if (lockedRows.rows.length === 0) {
      throw new FinanceValidationError(`Signal ${input.signalId} no existe.`, 404)
    }

    const signal = lockedRows.rows[0]

    if (signal.account_resolution_status === 'adopted' && signal.promoted_payment_id) {
      throw new FinanceValidationError(
        `Signal ${input.signalId} ya fue adoptada (payment ${signal.promoted_payment_id}).`,
        409
      )
    }

    if (signal.account_resolution_status === 'superseded' || signal.account_resolution_status === 'dismissed') {
      throw new FinanceValidationError(
        `Signal ${input.signalId} esta en estado ${signal.account_resolution_status}, no se puede adoptar.`,
        409
      )
    }

    if (signal.document_kind === 'unknown' || !signal.document_id) {
      throw new FinanceValidationError(
        `Signal ${input.signalId} no tiene documento asociado; necesita un income/expense linked antes de adoptar.`,
        400
      )
    }

    const amount = Number(signal.amount)

    const signalDate = typeof signal.signal_date === 'string'
      ? signal.signal_date
      : signal.signal_date.toISOString().slice(0, 10)

    const reference = `signal:${signal.source_system}:${signal.source_event_id}`

    const notes = input.notes
      ? `Adoptada desde signal ${signal.signal_id} (${signal.source_system}). ${input.notes}`
      : `Adoptada desde signal ${signal.signal_id} (${signal.source_system}).`

    let promotedPaymentKind: 'income_payment' | 'expense_payment'
    let promotedPaymentId: string

    if (signal.document_kind === 'income') {
      const result = await recordPayment({
        incomeId: signal.document_id,
        paymentDate: signalDate,
        amount,
        currency: signal.currency,
        reference,
        paymentMethod: 'bank_transfer',
        paymentAccountId: accountId,
        paymentSource: 'client_direct',
        notes,
        actorUserId: input.actorUserId
      })

      promotedPaymentKind = 'income_payment'
      promotedPaymentId = result.payment.paymentId
    } else {
      const result = await recordExpensePayment({
        expenseId: signal.document_id,
        paymentDate: signalDate,
        amount,
        currency: signal.currency,
        reference,
        paymentMethod: 'bank_transfer',
        paymentAccountId: accountId,
        paymentSource: 'manual',
        notes,
        actorUserId: input.actorUserId
      })

      promotedPaymentKind = 'expense_payment'
      promotedPaymentId = result.payment.paymentId
    }

    const resolutionMethod: ExternalCashSignalResolutionMethod = 'manual_admin'

    await client.query(
      `
        UPDATE greenhouse_finance.external_cash_signals
        SET account_resolution_status = 'adopted',
            resolved_account_id = $1,
            resolved_at = NOW(),
            resolved_by_user_id = $2,
            resolution_method = $3,
            promoted_payment_kind = $4,
            promoted_payment_id = $5,
            updated_at = NOW()
        WHERE signal_id = $6
      `,
      [accountId, input.actorUserId, resolutionMethod, promotedPaymentKind, promotedPaymentId, input.signalId]
    )

    return {
      signalId: input.signalId,
      promotedPaymentKind,
      promotedPaymentId,
      resolvedAccountId: accountId
    }
  })
}
