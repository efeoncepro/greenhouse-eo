import 'server-only'

import { query } from '@/lib/db'

export type PayrollEntryDownstreamState =
  | 'no_obligation' // todavia no se materializo (period no exportado o member sin entry)
  | 'awaiting_order' // obligation generated, sin order viva
  | 'order_pending_approval'
  | 'order_approved'
  | 'order_scheduled'
  | 'order_submitted'
  | 'order_paid_unreconciled' // order paid, expense_payment creado, sin reconciliar
  | 'reconciled' // expense_payment.is_reconciled=TRUE
  | 'closed'
  | 'blocked_no_profile' // resolver retorna profile_missing — bloquea creacion de order

export interface PayrollEntryDownstreamStatus {
  entryId: string
  memberId: string
  memberName: string | null
  obligationId: string | null
  obligationStatus: string | null
  orderId: string | null
  orderState: string | null
  expensePaymentId: string | null
  reconciled: boolean
  state: PayrollEntryDownstreamState
  blockReason: string | null
}

export interface PayrollPeriodDownstreamSummary {
  periodId: string
  totalEntries: number
  totalObligations: number
  totalOrdersPaid: number
  totalReconciled: number
  totalBlocked: number
  totalAmountObligationsClp: number
  totalAmountPaidClp: number
  byEntry: PayrollEntryDownstreamStatus[]
}

interface AggRow extends Record<string, unknown> {
  entry_id: string
  member_id: string
  member_name: string | null
  obligation_id: string | null
  obligation_status: string | null
  obligation_amount: number | string | null
  obligation_currency: string | null
  order_id: string | null
  order_state: string | null
  expense_payment_id: string | null
  payment_amount_clp: number | string | null
  payment_is_reconciled: boolean | null
}

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : 0
  }

  return 0
}

const deriveState = (row: AggRow): { state: PayrollEntryDownstreamState; blockReason: string | null } => {
  if (!row.obligation_id) {
    return { state: 'no_obligation', blockReason: null }
  }

  if (row.obligation_status === 'closed' || row.obligation_status === 'reconciled') {
    return { state: 'reconciled', blockReason: null }
  }

  if (row.obligation_status === 'cancelled' || row.obligation_status === 'superseded') {
    return { state: 'no_obligation', blockReason: `obligation_${row.obligation_status}` }
  }

  if (!row.order_id) {
    return { state: 'awaiting_order', blockReason: null }
  }

  if (row.order_state === 'paid' || row.order_state === 'settled') {
    if (row.payment_is_reconciled === true) {
      return { state: 'reconciled', blockReason: null }
    }

    return { state: 'order_paid_unreconciled', blockReason: null }
  }

  if (row.order_state === 'submitted') return { state: 'order_submitted', blockReason: null }
  if (row.order_state === 'scheduled') return { state: 'order_scheduled', blockReason: null }
  if (row.order_state === 'approved') return { state: 'order_approved', blockReason: null }

  if (row.order_state === 'pending_approval') {
    return { state: 'order_pending_approval', blockReason: null }
  }

  return { state: 'awaiting_order', blockReason: row.order_state }
}

/**
 * Lee el estado downstream del pago para todos los entries de un periodo
 * Payroll. NO escribe en payroll_entries — es read-only que compone:
 *
 *   payroll_entries (canonical) ← LEFT JOIN
 *   payment_obligations (TASK-748: source_kind='payroll', kind='employee_net_pay')
 *   payment_order_lines (TASK-750: por la order viva, no superseded)
 *   payment_orders (state machine)
 *   expense_payments (link via payment_order_line_id desde TASK-751)
 *
 * V1 enfoca employee_net_pay. Otros kinds (employer_social_security
 * consolidado, processor_fee, fx_component) tienen su propio reader si
 * emerge la necesidad.
 */
export async function getPayrollPaymentStatusForPeriod(
  periodId: string
): Promise<PayrollPeriodDownstreamSummary> {
  const rows = await query<AggRow>(
    `WITH live_obligations AS (
       SELECT DISTINCT ON (o.beneficiary_id)
              o.obligation_id, o.beneficiary_id, o.status, o.amount, o.currency
         FROM greenhouse_finance.payment_obligations o
        WHERE o.source_kind = 'payroll'
          AND o.obligation_kind = 'employee_net_pay'
          AND o.period_id = $1
          AND o.status NOT IN ('cancelled', 'superseded')
        ORDER BY o.beneficiary_id, o.created_at DESC
     ),
     active_lines AS (
       SELECT DISTINCT ON (l.obligation_id)
              l.obligation_id, l.line_id, l.order_id, l.expense_payment_id, l.state AS line_state
         FROM greenhouse_finance.payment_order_lines l
        WHERE l.state NOT IN ('cancelled', 'failed')
        ORDER BY l.obligation_id, l.created_at DESC
     )
     SELECT
       e.entry_id,
       e.member_id,
       m.display_name AS member_name,
       lo.obligation_id,
       lo.status AS obligation_status,
       lo.amount AS obligation_amount,
       lo.currency AS obligation_currency,
       al.order_id,
       po.state AS order_state,
       al.expense_payment_id,
       ep.amount_clp AS payment_amount_clp,
       ep.is_reconciled AS payment_is_reconciled
     FROM greenhouse_payroll.payroll_entries e
     LEFT JOIN greenhouse_core.members m ON m.member_id = e.member_id
     LEFT JOIN live_obligations lo ON lo.beneficiary_id = e.member_id
     LEFT JOIN active_lines al ON al.obligation_id = lo.obligation_id
     LEFT JOIN greenhouse_finance.payment_orders po ON po.order_id = al.order_id
     LEFT JOIN greenhouse_finance.expense_payments ep ON ep.payment_id = al.expense_payment_id
    WHERE e.period_id = $1
      AND COALESCE(e.is_active, TRUE) = TRUE
    ORDER BY e.member_id ASC`,
    [periodId]
  )

  const byEntry: PayrollEntryDownstreamStatus[] = rows.map(row => {
    const { state, blockReason } = deriveState(row)

    return {
      entryId: row.entry_id,
      memberId: row.member_id,
      memberName: row.member_name,
      obligationId: row.obligation_id,
      obligationStatus: row.obligation_status,
      orderId: row.order_id,
      orderState: row.order_state,
      expensePaymentId: row.expense_payment_id,
      reconciled: row.payment_is_reconciled === true,
      state,
      blockReason
    }
  })

  let totalObligations = 0
  let totalOrdersPaid = 0
  let totalReconciled = 0
  let totalBlocked = 0
  let totalAmountObligationsClp = 0
  let totalAmountPaidClp = 0

  for (const row of rows) {
    if (row.obligation_id) totalObligations += 1
    if (row.order_state === 'paid' || row.order_state === 'settled') totalOrdersPaid += 1
    if (row.payment_is_reconciled === true) totalReconciled += 1

    if (row.obligation_currency === 'CLP') {
      totalAmountObligationsClp += toNumber(row.obligation_amount)
    }

    if (row.payment_amount_clp !== null) {
      totalAmountPaidClp += toNumber(row.payment_amount_clp)
    }
  }

  totalBlocked = byEntry.filter(e => e.state === 'blocked_no_profile').length

  return {
    periodId,
    totalEntries: byEntry.length,
    totalObligations,
    totalOrdersPaid,
    totalReconciled,
    totalBlocked,
    totalAmountObligationsClp,
    totalAmountPaidClp,
    byEntry
  }
}
