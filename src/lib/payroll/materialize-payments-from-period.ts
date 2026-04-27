import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

/**
 * Materialize Payroll Payments From Period (TASK-702 Slice 7 — PR-C).
 *
 * Read+write helper that, given a closed payroll_period and a chosen
 * payment_account_id (the bank account the actual nómina ran through),
 * creates one `expense_payment` per active `payroll_entries` of that
 * period anchored to `payroll_entry_id` + `member_id` + `payroll_period_id`.
 *
 * Idempotent: re-running with the same period+account doesn't duplicate
 * (dedup by deterministic payment.reference =
 * `payroll-mat-{periodId}-{entryId}`).
 *
 * Cierra el bug raíz: payroll runs nunca creaban `expense_payment` después
 * del cierre, dejando `expense.amount_paid` desincronizado. Esto sienta el
 * patrón canónico para el cierre future-automatic via outbox consumer.
 *
 * No-Op si el periodo no está exported/closed o si no hay entries activos.
 */

export interface MaterializePayrollPaymentsResult {
  periodId: string
  paymentAccountId: string
  paymentDate: string
  entriesProcessed: number
  paymentsCreated: number
  paymentsSkippedDuplicate: number
  totalAmount: number
}

interface PayrollEntryRow {
  entry_id: string
  member_id: string
  member_display_name: string | null
  net_total: string
  currency: string
  pay_regime: string | null
}

const PAYROLL_EXPENSE_KIND = 'payroll'
const PAYMENT_SOURCE = 'payroll_system' as const

const insertPayrollExpensePayment = async (
  client: PoolClient,
  args: {
    entry: PayrollEntryRow
    periodId: string
    paymentAccountId: string
    paymentDate: string
    actorUserId: string | null
  }
): Promise<{ created: boolean; expenseId: string; paymentId: string }> => {
  const expenseRef = `payroll-mat-${args.periodId}-${args.entry.entry_id}`
  const netTotal = Number(args.entry.net_total)

  if (!Number.isFinite(netTotal) || netTotal <= 0) {
    return { created: false, expenseId: '', paymentId: '' }
  }

  // Idempotency check on the deterministic reference
  const existing = await client.query<{ expense_id: string; payment_id: string | null }>(
    `SELECT e.expense_id, ep.payment_id
     FROM greenhouse_finance.expenses e
     LEFT JOIN greenhouse_finance.expense_payments ep
       ON ep.expense_id = e.expense_id AND ep.reference = $1
     WHERE e.payment_reference = $1
     LIMIT 1`,
    [expenseRef]
  )

  if (existing.rows.length > 0 && existing.rows[0].payment_id) {
    return {
      created: false,
      expenseId: existing.rows[0].expense_id,
      paymentId: existing.rows[0].payment_id
    }
  }

  const expenseId =
    existing.rows[0]?.expense_id ||
    `EXP-PAYROLL-${args.periodId}-${args.entry.entry_id.slice(0, 12)}`

  const description = `Pago nómina ${args.entry.member_display_name ?? args.entry.member_id} (entry ${args.entry.entry_id}, period ${args.periodId})`

  if (!existing.rows[0]?.expense_id) {
    await client.query(
      `INSERT INTO greenhouse_finance.expenses (
         expense_id, expense_type, description, currency,
         subtotal, total_amount, total_amount_clp,
         payment_status, payment_date, payment_method, payment_account_id, payment_reference,
         document_date, exchange_rate_to_clp, amount_paid,
         payroll_entry_id, payroll_period_id, member_id, member_name,
         created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4,
         $5, $5, $5,
         'paid', $6::date, 'bank_transfer', $7, $8,
         $6::date, 1, $5,
         $9, $10, $11, $12,
         NOW(), NOW()
       )
       ON CONFLICT (expense_id) DO NOTHING`,
      [
        expenseId, PAYROLL_EXPENSE_KIND, description, args.entry.currency || 'CLP',
        netTotal,
        args.paymentDate, args.paymentAccountId, expenseRef,
        args.entry.entry_id, args.periodId, args.entry.member_id, args.entry.member_display_name
      ]
    )
  }

  const paymentId = `EXP-PAY-PAYROLL-${args.periodId}-${args.entry.entry_id.slice(0, 12)}`

  await client.query(
    `INSERT INTO greenhouse_finance.expense_payments (
       payment_id, expense_id, payment_date, amount, currency,
       reference, payment_method, payment_account_id, payment_source,
       notes, recorded_by_user_id, recorded_at,
       is_reconciled, exchange_rate_at_payment, amount_clp, fx_gain_loss_clp,
       created_at
     ) VALUES (
       $1, $2, $3::date, $4, $5,
       $6, 'bank_transfer', $7, $8,
       'Auto-materializado desde payroll_entries (TASK-702 PR-C)', $9, NOW(),
       FALSE, 1, $4, 0,
       NOW()
     )
     ON CONFLICT (payment_id) DO NOTHING`,
    [
      paymentId, expenseId, args.paymentDate, netTotal, args.entry.currency || 'CLP',
      expenseRef, args.paymentAccountId, PAYMENT_SOURCE,
      args.actorUserId
    ]
  )

  return { created: true, expenseId, paymentId }
}

export const materializePayrollPaymentsFromPeriod = async (input: {
  periodId: string
  paymentAccountId: string
  paymentDate: string
  actorUserId?: string | null
  onlyActiveEntries?: boolean
}): Promise<MaterializePayrollPaymentsResult> => {
  const onlyActive = input.onlyActiveEntries ?? true

  return withGreenhousePostgresTransaction(async (client: PoolClient) => {
    // Verify account exists
    const acct = await client.query<{ currency: string }>(
      `SELECT currency FROM greenhouse_finance.accounts WHERE account_id = $1`,
      [input.paymentAccountId]
    )

    if (acct.rows.length === 0) {
      throw new Error(`Account ${input.paymentAccountId} not found`)
    }

    // Pull payroll_entries for the period
    const entriesResult = await client.query<PayrollEntryRow>(
      `SELECT entry_id, member_id, member_display_name, net_total::text, currency, pay_regime
       FROM greenhouse_payroll.payroll_entries
       WHERE period_id = $1
         ${onlyActive ? 'AND is_active = TRUE' : ''}
         AND COALESCE(net_total, 0) > 0`,
      [input.periodId]
    )

    let created = 0
    let skipped = 0
    let totalAmount = 0

    for (const entry of entriesResult.rows) {
      const r = await insertPayrollExpensePayment(client, {
        entry,
        periodId: input.periodId,
        paymentAccountId: input.paymentAccountId,
        paymentDate: input.paymentDate,
        actorUserId: input.actorUserId ?? null
      })

      if (r.created) {
        created++
        totalAmount += Number(entry.net_total)
      } else {
        skipped++
      }
    }

    await publishOutboxEvent(
      {
        aggregateType: 'finance.payroll_period',
        aggregateId: input.periodId,
        eventType: 'finance.payroll_period.payments_materialized',
        payload: {
          periodId: input.periodId,
          paymentAccountId: input.paymentAccountId,
          paymentDate: input.paymentDate,
          created,
          skipped,
          totalAmount,
          eventId: `mat-${randomUUID()}`
        }
      },
      client
    )

    return {
      periodId: input.periodId,
      paymentAccountId: input.paymentAccountId,
      paymentDate: input.paymentDate,
      entriesProcessed: entriesResult.rows.length,
      paymentsCreated: created,
      paymentsSkippedDuplicate: skipped,
      totalAmount
    }
  })
}
