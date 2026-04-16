import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { getMonthDateRange } from '@/lib/finance/periods'

/**
 * TASK-411 — Payroll Reliquidación Finance Delta Consumer.
 *
 * Applies the NET-total delta of a payroll reliquidation as a signed
 * finance expense row. The row is posted into the original operational month
 * (so P&L, cost attribution, and client economics all rebuild into the
 * correct period), linked back to the reopen audit row, and tagged with
 * `source_type = 'payroll_reliquidation'` so the base payroll materialization
 * ignores it on subsequent runs.
 *
 * **Why net and not gross** (hotfix 2026-04-15): the base payroll expense
 * written by `finance_expense_reactive_intake` uses `payroll_entries.net_total`
 * (the "nómina neta" that actually gets paid to the worker). For Chile
 * contracts, gross ≠ net because worker-side deductions (AFP, salud,
 * impuesto) are withheld in payroll. Using `deltaGross` in the delta row
 * while the base row tracks `net_total` breaks the accounting invariant:
 * `sum(base + deltas) != final_net`. All delta rows must reference the
 * same amount dimension as the base row they correct. For international
 * / Deel contracts gross == net so the choice is invisible, but Chile
 * regime reliquidations like Valentina Hoyos on Marzo 2026 surfaced the
 * bug (gross delta CLP 823 vs net delta CLP 56.95). The consumer now
 * expects `deltaNet` and `previousNet`/`newNet` in the payload and uses
 * them exclusively. `deltaGross` is still recorded in `notes` for audit
 * trail because it's useful for forensics.
 *
 * Idempotency is provided by the reactive consumer: the outbox event is
 * processed once per (projection, scope) group, and the expense row carries
 * `source_id = eventId` for trail-back if an operator needs to correlate.
 *
 * The helper runs inside a transaction client supplied by the caller so the
 * framework can compose it with outbox publishing and other side-effects.
 */

export type ApplyPayrollReliquidationDeltaResult = 'applied' | 'noop'

export interface ApplyPayrollReliquidationDeltaParams {
  client: PoolClient
  periodId: string
  memberId: string
  operationalYear: number
  operationalMonth: number
  previousNet: number
  newNet: number
  deltaNet: number
  previousGross: number
  newGross: number
  deltaGross: number
  currency: 'CLP' | 'USD'
  reopenAuditId: string
  reason: string
  eventId: string
}

const isValidMonth = (month: number) => Number.isInteger(month) && month >= 1 && month <= 12

const isValidYear = (year: number) => Number.isInteger(year) && year >= 1970 && year <= 9999

const roundMoney = (value: number) => Math.round(value * 100) / 100

export const applyPayrollReliquidationDelta = async (
  params: ApplyPayrollReliquidationDeltaParams
): Promise<ApplyPayrollReliquidationDeltaResult> => {
  const {
    client,
    periodId,
    memberId,
    operationalYear,
    operationalMonth,
    previousNet,
    newNet,
    deltaNet,
    previousGross,
    newGross,
    deltaGross,
    currency,
    reopenAuditId,
    reason,
    eventId
  } = params

  if (!isValidYear(operationalYear) || !isValidMonth(operationalMonth)) {
    throw new Error(
      `applyPayrollReliquidationDelta: invalid operational period ${operationalYear}-${operationalMonth}`
    )
  }

  if (currency !== 'CLP' && currency !== 'USD') {
    throw new Error(`applyPayrollReliquidationDelta: invalid currency "${currency}"`)
  }

  const rounded = roundMoney(deltaNet)

  if (!Number.isFinite(rounded) || rounded === 0) {
    console.info(
      `[payroll-reliquidation-delta] noop for period=${periodId} member=${memberId} deltaNet=${deltaNet} (previousNet=${previousNet}, newNet=${newNet})`
    )

    return 'noop'
  }

  const { periodEnd: expenseDate } = getMonthDateRange(operationalYear, operationalMonth)
  const expenseId = `EXP-RELIQ-${periodId}-${memberId}-${randomUUID().slice(0, 8)}`
  const exchangeRateToClp = currency === 'USD' ? 0 : 1
  const totalAmountClp = currency === 'USD' ? 0 : rounded
  const description = `Reliquidación nómina ${periodId} (${reason})`

  const notes = [
    'TASK-411 payroll reliquidation delta',
    `eventId=${eventId}`,
    `previousNet=${roundMoney(previousNet)}`,
    `newNet=${roundMoney(newNet)}`,
    `deltaNet=${rounded}`,
    `previousGross=${roundMoney(previousGross)}`,
    `newGross=${roundMoney(newGross)}`,
    `deltaGross=${roundMoney(deltaGross)}`
  ].join(' ')

  await client.query(
    `
      INSERT INTO greenhouse_finance.expenses (
        expense_id, client_id, space_id, expense_type, source_type, description, currency,
        subtotal, tax_rate, tax_amount, total_amount,
        exchange_rate_to_clp, total_amount_clp,
        payment_date, payment_status, payment_method, payment_provider, payment_rail, payment_account_id, payment_reference,
        document_number, document_date, due_date,
        supplier_id, supplier_name, supplier_invoice_number,
        payroll_period_id, payroll_entry_id, member_id, member_name,
        social_security_type, social_security_institution, social_security_period,
        tax_type, tax_period, tax_form_number,
        miscellaneous_category, service_line, is_recurring, recurrence_frequency,
        is_reconciled,
        cost_category, cost_is_direct, allocated_client_id,
        direct_overhead_scope, direct_overhead_kind, direct_overhead_member_id,
        notes, created_by_user_id,
        reopen_audit_id,
        created_at, updated_at
      )
      VALUES (
        $1, NULL, NULL, 'payroll', 'payroll_reliquidation', $2, $3,
        $4, 0, 0, $4,
        $5, $6,
        $7::date, 'pending', NULL, NULL, 'payroll_file', NULL, NULL,
        NULL, $7::date, NULL,
        NULL, NULL, NULL,
        $8, NULL, $9, NULL,
        NULL, NULL, NULL,
        NULL, NULL, NULL,
        NULL, NULL, FALSE, NULL,
        FALSE,
        'direct_labor', FALSE, NULL,
        'none', NULL, NULL,
        $10, NULL,
        $11,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `,
    [
      expenseId,
      description,
      currency,
      rounded,
      exchangeRateToClp,
      totalAmountClp,
      expenseDate,
      periodId,
      memberId,
      notes,
      reopenAuditId
    ]
  )

  console.info(
    `[payroll-reliquidation-delta] applied period=${periodId} member=${memberId} deltaNet=${rounded} ${currency} expense=${expenseId}`
  )

  return 'applied'
}
