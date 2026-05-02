import 'server-only'

import type { PoolClient } from 'pg'

import { query, withTransaction } from '@/lib/db'

import { recordExpensePayment } from '@/lib/finance/expense-payment-ledger'
import { materializePayrollExpensesForExportedPeriod } from '@/lib/finance/payroll-expense-reactive'

import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  PaymentOrderExpenseUnresolvedError,
  PaymentOrderSettlementBlockedError,
  type PaymentOrderSettlementBlockedReason
} from './errors'

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

const parseYearMonthFromPeriodId = (
  periodId: string | null
): { year: number; month: number } | null => {
  if (!periodId) return null

  // canonical period_id formats observed in greenhouse: `YYYY-MM`,
  // `payroll-YYYY-MM`, or any string that contains a YYYY-MM token. Be
  // defensive — the resolver should never crash if format drifts.
  const match = periodId.match(/(\d{4})-(\d{1,2})/)

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])

  if (!Number.isInteger(year) || !Number.isInteger(month)) return null
  if (month < 1 || month > 12) return null

  return { year, month }
}

/**
 * TASK-765 Slice 4 — publica el outbox event canonical de bloqueo de
 * settlement antes de re-throw. Cualquier consumer (UI banner, AI Observer,
 * notification policy) escucha este evento — registrado en
 * GREENHOUSE_EVENT_CATALOG_V1.md como `finance.payment_order.settlement_blocked`
 * con shape v1 versionado.
 */
const publishSettlementBlockedEvent = async (params: {
  orderId: string
  reason: PaymentOrderSettlementBlockedReason
  detail: string
  affectedLineIds: string[]
}): Promise<void> => {
  await publishOutboxEvent({
    aggregateType: 'payment_order',
    aggregateId: params.orderId,
    eventType: 'finance.payment_order.settlement_blocked',
    payload: {
      eventVersion: 'v1',
      orderId: params.orderId,
      state: 'paid',
      reason: params.reason,
      detail: params.detail,
      affectedLineIds: params.affectedLineIds,
      blockedAt: new Date().toISOString()
    }
  })
}

export interface RecordPaymentFromOrderInput {
  orderId: string
  actorUserId?: string | null
}

/**
 * Cuando una payment_order pasa a `state='paid'` (TASK-750), itera sus
 * lines y crea un `expense_payment` por cada una con link bidireccional
 * (`payment_order_line_id` ↔ `expense_payment_id`). Idempotente: si la
 * line ya tiene `expense_payment_id`, se skipea (no-op real).
 *
 * **TASK-765 Slice 4 — resolver loud, no silencioso.**
 *
 * El comportamiento V1 (skip silencioso con `skipped[]` cuando expense
 * no se encuentra o cuando el obligation_kind esta fuera de scope) se
 * convirtio en throw + outbox event `finance.payment_order.settlement_blocked`.
 * El skip silencioso de `expense_not_found` causaba el incidente
 * 2026-05-01: orders quedaban `state='paid'` sin afectar el banco y nadie
 * alertaba.
 *
 * Nuevo contrato:
 * - `already_linked` (line ya tiene expense_payment_id) → skip silencioso preservado.
 * - `expense_not_found` → invoca materializePayrollExpensesForExportedPeriod
 *   (idempotente), re-lookup; si sigue ausente → throw
 *   PaymentOrderExpenseUnresolvedError + outbox settlement_blocked.
 * - `out_of_scope_v1` (source_kind!=payroll OR obligation_kind!=employee_net_pay)
 *   → throw PaymentOrderSettlementBlockedError(reason='out_of_scope_v1')
 *   + outbox settlement_blocked. NO skip.
 * - `recordExpensePayment` falla (CHECK, FK, race) → wrap en
 *   PaymentOrderSettlementBlockedError(reason='cutover_violation' | 'unknown')
 *   con `cause` original + outbox settlement_blocked.
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
      // Idempotent no-op: la line ya quedo wired en una corrida previa.
      // Skip silencioso aqui es legitimo — no es un problema de settlement.
      skipped.push({ lineId: line.line_id, reason: 'already_linked' })

      continue
    }

    if (line.source_kind !== 'payroll' || line.obligation_kind !== 'employee_net_pay') {
      // V1 solo cubre payroll/employee_net_pay. Otros kinds NO se skipean
      // silenciosamente — emiten settlement_blocked + throw para que el
      // operador (o un V2 path) los resuelva explicitamente.
      const detail = `out_of_scope_v1 (source=${line.source_kind ?? 'null'}, kind=${line.obligation_kind})`

      await publishSettlementBlockedEvent({
        orderId: input.orderId,
        reason: 'out_of_scope_v1',
        detail,
        affectedLineIds: [line.line_id]
      })

      throw new PaymentOrderSettlementBlockedError(
        input.orderId,
        'out_of_scope_v1',
        detail,
        line.line_id
      )
    }

    let expenseId: string | null = null

    await withTransaction(async c => {
      expenseId = await resolvePayrollExpenseIdViaTx(c, line)
    })

    // Materialize-or-throw: si el lookup miss, intentar materializar
    // expenses para ese periodo (idempotente — skipea filas existentes)
    // y re-lookup. Si sigue ausente, es un settlement bloqueado real.
    if (!expenseId) {
      const ym = parseYearMonthFromPeriodId(line.period_id)

      if (ym && line.period_id) {
        try {
          await materializePayrollExpensesForExportedPeriod({
            periodId: line.period_id,
            year: ym.year,
            month: ym.month
          })
        } catch (matErr) {
          // El materializer tambien fallo — esto es materializer dead-letter.
          const detail = `materializer failed: ${matErr instanceof Error ? matErr.message : String(matErr)}`

          await publishSettlementBlockedEvent({
            orderId: input.orderId,
            reason: 'materializer_dead_letter',
            detail,
            affectedLineIds: [line.line_id]
          })

          throw new PaymentOrderSettlementBlockedError(
            input.orderId,
            'materializer_dead_letter',
            detail,
            line.line_id
          )
        }

        // Re-lookup despues de materializar.
        await withTransaction(async c => {
          expenseId = await resolvePayrollExpenseIdViaTx(c, line)
        })
      }

      if (!expenseId) {
        const detail = `expense_not_found despues de materializer (period=${line.period_id}, member=${line.beneficiary_id})`

        await publishSettlementBlockedEvent({
          orderId: input.orderId,
          reason: 'expense_unresolved',
          detail,
          affectedLineIds: [line.line_id]
        })

        throw new PaymentOrderExpenseUnresolvedError(
          input.orderId,
          line.line_id,
          line.period_id,
          line.beneficiary_id
        )
      }
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
      // recordExpensePayment fail (CHECK constraint, FK, race) — wrap como
      // settlement_blocked con cause original preservado para audit.
      const message = err instanceof Error ? err.message : String(err)

      const reason: PaymentOrderSettlementBlockedReason = /cutover|payment_account_required/i.test(message)
        ? 'cutover_violation'
        : 'unknown'

      const detail = `recordExpensePayment failed: ${message}`

      await publishSettlementBlockedEvent({
        orderId: input.orderId,
        reason,
        detail,
        affectedLineIds: [line.line_id]
      })

      // Throw con `cause` para que el caller (proyector) y Sentry preserven
      // la chain del error original.
      const wrapped = new PaymentOrderSettlementBlockedError(
        input.orderId,
        reason,
        detail,
        line.line_id
      )

      ;(wrapped as Error & { cause?: unknown }).cause = err
      throw wrapped
    }
  }

  return {
    orderId: input.orderId,
    recordedExpensePayments,
    skipped
  }
}
