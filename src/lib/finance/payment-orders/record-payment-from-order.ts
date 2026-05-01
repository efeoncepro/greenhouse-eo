import 'server-only'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'

import { recordExpensePayment } from '@/lib/finance/expense-payment-ledger'

interface OrderHeaderRow extends Record<string, unknown> {
  order_id: string
  state: string
  payment_method: string | null
  source_account_id: string | null
  paid_at: string | null
  external_reference: string | null
}

interface LineForExecution extends Record<string, unknown> {
  line_id: string
  obligation_id: string
  amount: number | string
  currency: string
  state: string
  expense_payment_id: string | null
  beneficiary_type: string
  beneficiary_id: string
  obligation_kind: string
  source_kind: string | null
  source_ref: string | null
  period_id: string | null
}

export interface RecordedFromOrderResult {
  orderId: string
  recordedExpensePayments: Array<{
    lineId: string
    expensePaymentId: string
    expenseId: string
  }>
  skipped: Array<{ lineId: string; reason: string }>
}

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : 0
  }

  return 0
}

const resolvePayrollExpenseIdViaTx = async (
  c: PoolClient,
  line: LineForExecution
): Promise<string | null> => {
  if (line.source_kind !== 'payroll') return null
  if (line.obligation_kind !== 'employee_net_pay') return null
  if (line.beneficiary_type !== 'member') return null
  if (!line.period_id) return null

  const result = await c.query<{ expense_id: string }>(
    `SELECT expense_id
       FROM greenhouse_finance.expenses
      WHERE payroll_period_id = $1
        AND member_id = $2
        AND expense_type = 'payroll'
        AND source_type = 'payroll_generated'
        AND COALESCE(is_annulled, FALSE) = FALSE
      ORDER BY created_at DESC
      LIMIT 1`,
    [line.period_id, line.beneficiary_id]
  )

  return result.rows[0]?.expense_id ?? null
}

export interface RecordPaymentFromOrderInput {
  orderId: string
  actorUserId?: string | null
}

/**
 * Cuando una payment_order pasa a `state='paid'` (TASK-750), itera sus
 * lines y crea un `expense_payment` por cada una con link bidireccional
 * (`payment_order_line_id` ↔ `expense_payment_id`). Idempotente: si la
 * line ya tiene `expense_payment_id`, se skipea.
 *
 * V1 solo procesa lines payroll con obligation_kind='employee_net_pay'.
 * Otros kinds (employer_social_security, processor_fee, fx_component) se
 * registran como `skipped` con reason claro — el operator los maneja por
 * el path legacy hasta que V2 introduzca resolvers especificos.
 *
 * Cada line se procesa con su propia transaccion (via recordExpensePayment
 * que ya es atomic). Si una falla, las anteriores quedan registradas
 * — el partial unique index sobre payment_order_line_id garantiza que un
 * retry no duplica.
 */
export async function recordPaymentForOrder(
  input: RecordPaymentFromOrderInput
): Promise<RecordedFromOrderResult> {
  const headerRows = await query<OrderHeaderRow>(
    `SELECT order_id, state, payment_method, source_account_id, paid_at::text AS paid_at, external_reference
       FROM greenhouse_finance.payment_orders
      WHERE order_id = $1
      LIMIT 1`,
    [input.orderId]
  )

  if (headerRows.length === 0) {
    throw new Error(`Order ${input.orderId} no existe`)
  }

  const order = headerRows[0]

  if (order.state !== 'paid') {
    return { orderId: input.orderId, recordedExpensePayments: [], skipped: [] }
  }

  const lines = await query<LineForExecution>(
    `SELECT l.line_id, l.obligation_id, l.amount, l.currency, l.state,
            l.expense_payment_id,
            o.beneficiary_type, o.beneficiary_id, o.obligation_kind,
            o.source_kind, o.source_ref, o.period_id
       FROM greenhouse_finance.payment_order_lines l
       JOIN greenhouse_finance.payment_obligations o
         ON o.obligation_id = l.obligation_id
      WHERE l.order_id = $1`,
    [input.orderId]
  )

  const recordedExpensePayments: RecordedFromOrderResult['recordedExpensePayments'] = []
  const skipped: RecordedFromOrderResult['skipped'] = []

  const paymentDate = order.paid_at ? order.paid_at.slice(0, 10) : new Date().toISOString().slice(0, 10)

  for (const line of lines) {
    if (line.expense_payment_id) {
      skipped.push({ lineId: line.line_id, reason: 'already_linked' })

      continue
    }

    if (line.source_kind !== 'payroll' || line.obligation_kind !== 'employee_net_pay') {
      skipped.push({
        lineId: line.line_id,
        reason: `out_of_scope_v1 (source=${line.source_kind ?? 'null'}, kind=${line.obligation_kind})`
      })

      continue
    }

    let expenseId: string | null = null

    await withTransaction(async c => {
      expenseId = await resolvePayrollExpenseIdViaTx(c, line)
    })

    if (!expenseId) {
      skipped.push({
        lineId: line.line_id,
        reason: `expense_not_found (period=${line.period_id}, member=${line.beneficiary_id})`
      })

      continue
    }

    try {
      const result = await recordExpensePayment({
        expenseId,
        paymentDate,
        amount: toNumber(line.amount),
        currency: line.currency,
        paymentMethod: order.payment_method ?? null,
        paymentAccountId: order.source_account_id ?? null,
        paymentSource: 'payroll_system',
        reference: order.external_reference ?? `order:${order.order_id}/line:${line.line_id}`,
        actorUserId: input.actorUserId ?? null,
        paymentOrderLineId: line.line_id,
        notes: `TASK-751 auto-recorded from payment_order ${order.order_id}`
      })

      recordedExpensePayments.push({
        lineId: line.line_id,
        expensePaymentId: result.payment.paymentId,
        expenseId: result.expenseId
      })
    } catch (err) {
      skipped.push({
        lineId: line.line_id,
        reason: `error: ${err instanceof Error ? err.message : String(err)}`
      })
    }
  }

  return {
    orderId: input.orderId,
    recordedExpensePayments,
    skipped
  }
}
