import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'
import { recordExpensePayment } from '@/lib/finance/expense-payment-ledger'
import { materializePayrollExpensesForExportedPeriod } from '@/lib/finance/payroll-expense-reactive'
import { captureWithDomain } from '@/lib/observability/capture'
import { publishPendingOutboxEvents } from '@/lib/sync/outbox-consumer'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { processReactiveEvents } from '@/lib/sync/reactive-consumer'
import type { PaymentOrder } from '@/types/payment-orders'

import {
  PaymentOrderConflictError,
  PaymentOrderExpenseUnresolvedError,
  PaymentOrderSettlementBlockedError,
  PaymentOrderValidationError
} from './errors'
import { mapOrderRow, type OrderRow } from './row-mapper'
import { resolvePaymentOrderSourcePolicy } from './source-instrument-policy'
import { recordPaymentOrderStateTransition } from './state-transitions-audit'
import { assertSourceAccountForPaid } from './transitions'

// TASK-765 Slice 5 — Path canonico atomico para mark-as-paid.
//
// Reemplaza el flujo asincronico (mark-paid -> outbox -> projection ->
// recordExpensePayment N veces -> account_balances rematerialization) por
// una sola transaccion donde TODO sucede o NADA. Garantia: si cualquier
// step falla, ROLLBACK completo. La order vuelve al estado anterior, sin
// zombie en `paid` con downstream incompleto.
//
// **Comportamiento del proyector reactivo `record_expense_payment_from_order`
// post-Slice 5**: sigue activo como safety net read-only. Cuando llega a
// procesar un order ya paid via path atomico, las lines ya tienen
// `expense_payment_id` no-null → el proyector las marca como `already_linked`
// y termina sin doble-escritura. Idempotencia preservada por el partial
// unique index `expense_payments_payment_order_line_uniq`.
//
// **Reactor escenarios cubiertos**:
//
// 1. Path atomico (slice 5, este archivo) → atomic happy path (99% del trafico).
// 2. Legacy orders pre-cutover que no pasaron por path atomico → safety
//    net catches them; resolver loud (slice 4) detecta y emite
//    `settlement_blocked` si miss.
// 3. Recovery del incidente (slice 8) → endpoint admin re-publica outbox
//    `finance.payment_order.paid` con flag replay; el path atomico no
//    aplica (la order ya esta `paid`); el proyector lo procesa via
//    safety net.

interface OrderHeaderRow extends Record<string, unknown> {
  order_id: string
  state: string
  processor_slug: string | null
  payment_method: string | null
  currency: string
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

export interface MarkPaymentOrderPaidAtomicInput {
  orderId: string
  paidBy: string
  paidAt?: string
  externalReference?: string
}

export interface MarkPaymentOrderPaidAtomicResult {
  order: PaymentOrder
  eventId: string
  expensePaymentIds: string[]
  settlementGroupIds: string[]
  auditTransitionId: string
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : 0
  }

  return 0
}

const parseYearMonthFromPeriodId = (
  periodId: string | null
): { year: number; month: number } | null => {
  if (!periodId) return null

  const match = periodId.match(/(\d{4})-(\d{1,2})/)

  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])

  if (!Number.isInteger(year) || !Number.isInteger(month)) return null
  if (month < 1 || month > 12) return null

  return { year, month }
}

/**
 * Resuelve el `expense_id` para una line via lookup en
 * `greenhouse_finance.expenses` con la convencion canonica:
 * `(payroll_period_id, member_id, expense_type='payroll', source_type='payroll_generated')`.
 */
const resolvePayrollExpenseIdInTx = async (
  client: PoolClient,
  line: LineForExecution
): Promise<string | null> => {
  if (line.source_kind !== 'payroll') return null
  if (line.obligation_kind !== 'employee_net_pay') return null
  if (line.beneficiary_type !== 'member') return null
  if (!line.period_id) return null

  const result = await client.query<{ expense_id: string }>(
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

/**
 * Path canonico atomico de TASK-765. Marca una payment_order como `paid`
 * y crea TODOS los downstream effects (expense_payment + settlement_leg +
 * outbox events) dentro de la misma transaccion. Si cualquier step falla,
 * ROLLBACK completo.
 *
 * Reglas:
 * - Estado inicial valido: `submitted`. Otros lanzan PaymentOrderConflictError.
 * - source_account_id obligatorio (slice 1 hard-gate).
 * - Solo procesa lines payroll/employee_net_pay (V1). Lines fuera de scope
 *   lanzan PaymentOrderSettlementBlockedError con reason='out_of_scope_v1'.
 * - expense_not_found dispara materializacion sincrona; si sigue ausente,
 *   throw PaymentOrderExpenseUnresolvedError (rollback).
 * - Idempotencia: si una line ya tiene expense_payment_id, se skipea.
 *   Re-llamar markPaymentOrderPaidAtomic con misma orderId post-paid es
 *   no-op (el SELECT inicial detecta state=paid y retorna sin mutaciones).
 */
/**
 * TASK-753 hardening — Drena inline el pipeline outbox+reactive despues
 * del commit del paid. La meta: las projections downstream
 * (`payslip_on_payment_paid` para emails, `record_expense_payment_from_order`
 * safety net, `account_balances` rematerialization) corran dentro del
 * response cycle (~1-2s) en lugar de esperar al cron (5min worst).
 *
 * Idempotency-by-design (NUNCA produce duplicados vs cron):
 *  - publishPendingOutboxEvents usa FOR UPDATE SKIP LOCKED.
 *  - processReactiveEvents usa outbox_reactive_log con UNIQUE
 *    (event_id, handler) + ON CONFLICT DO UPDATE.
 *
 * Failure mode preservado (eventual consistency):
 *  - Si la llamada inline FALLA: captureWithDomain('finance', ...) reporta
 *    a Sentry, NO se relanza. El order ya esta paid; el outbox event ya
 *    esta encolado. Cron de respaldo procesa al proximo tick.
 *  - El contract con el caller (return value de markPaymentOrderPaidAtomic)
 *    NO cambia.
 *
 * NUNCA throws hacia el caller — best effort accelerator.
 */
const drainOutboxPipelineAfterMarkPaid = async (orderId: string): Promise<void> => {
  try {
    await publishPendingOutboxEvents({ batchSize: 50 })
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'mark_paid_atomic_inline_drain.publish' },
      extra: { orderId }
    })

    return
  }

  try {
    // Domain 'notifications' incluye payslip_on_payment_paid + teams_notify;
    // Domain 'finance' cubre record_expense_payment + account_balances +
    // operational_pl + commercial_cost_attribution + period_closure_status.
    // Drenamos AMBOS en paralelo para que el flujo end-to-end llegue al
    // colaborador sin esperar al cron.
    await Promise.allSettled([
      processReactiveEvents({ domain: 'notifications', batchSize: 25 }),
      processReactiveEvents({ domain: 'finance', batchSize: 25 })
    ])
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'mark_paid_atomic_inline_drain.react' },
      extra: { orderId }
    })
  }
}

export async function markPaymentOrderPaidAtomic(
  input: MarkPaymentOrderPaidAtomicInput
): Promise<MarkPaymentOrderPaidAtomicResult> {
  if (!input.orderId) throw new PaymentOrderValidationError('orderId requerido')
  if (!input.paidBy) throw new PaymentOrderValidationError('paidBy requerido')

  const result = await withTransaction(async (client: PoolClient) => {
    // 1. SELECT FOR UPDATE — lock row contra concurrent transitions.
    const current = await client.query<OrderHeaderRow & OrderRow>(
      `SELECT *
         FROM greenhouse_finance.payment_orders
        WHERE order_id = $1
        FOR UPDATE`,
      [input.orderId]
    )

    if ((current.rowCount ?? 0) === 0) {
      throw new PaymentOrderValidationError(`Order ${input.orderId} no existe`, 'not_found', 404)
    }

    const row = current.rows[0]

    if (row.state !== 'submitted') {
      throw new PaymentOrderConflictError(
        `Solo se puede marcar como pagada desde 'submitted'. Estado actual: ${row.state}`,
        'invalid_state_transition'
      )
    }

    // 2. Hard-gate source_account_id (slice 1 mirror, defense in depth).
    assertSourceAccountForPaid(input.orderId, row.source_account_id, 'paid')

    const sourcePolicy = await resolvePaymentOrderSourcePolicy(client, {
      processorSlug: row.processor_slug,
      paymentMethod: row.payment_method,
      currency: row.currency,
      sourceAccountId: row.source_account_id
    })

    // 3. UPDATE state=paid + paid_at + external_reference.
    const updated = await client.query<OrderRow>(
      `UPDATE greenhouse_finance.payment_orders
          SET state = 'paid',
              paid_at = COALESCE($2::timestamptz, now()),
              external_reference = COALESCE($3, external_reference),
              updated_at = now()
        WHERE order_id = $1
        RETURNING *`,
      [input.orderId, input.paidAt ?? null, input.externalReference ?? null]
    )

    const order = mapOrderRow(updated.rows[0])

    // 4. Audit log append-only (slice 6).
    const auditTransition = await recordPaymentOrderStateTransition(
      {
        orderId: order.orderId,
        fromState: 'submitted',
        toState: 'paid',
        actorUserId: input.paidBy,
        reason: 'mark_paid_atomic',
          metadata: {
            externalReference: input.externalReference ?? null,
            sourceAccountId: order.sourceAccountId,
            treasurySourcePolicy: sourcePolicy.snapshot,
            path: 'atomic'
          }
      },
      client
    )

    // 5. Lines → paid + iterar para crear expense_payments downstream.
    const linesResult = await client.query<{ obligation_id: string }>(
      `UPDATE greenhouse_finance.payment_order_lines
          SET state = 'paid', updated_at = now()
        WHERE order_id = $1
          AND state IN ('pending', 'submitted')
        RETURNING obligation_id`,
      [input.orderId]
    )

    const obligationIds = linesResult.rows.map(r => r.obligation_id)

    if (obligationIds.length > 0) {
      // 6. Obligations → paid (idempotente: solo si todas las lines de la
      //    obligation cerraron).
      await client.query(
        `UPDATE greenhouse_finance.payment_obligations o
            SET status = 'paid', updated_at = now()
          WHERE o.obligation_id = ANY($1::text[])
            AND NOT EXISTS (
              SELECT 1 FROM greenhouse_finance.payment_order_lines l
               WHERE l.obligation_id = o.obligation_id
                 AND l.state NOT IN ('paid', 'cancelled', 'failed')
            )
            AND o.status = 'scheduled'`,
        [obligationIds]
      )
    }

    // 7. Iterar lines y crear expense_payment + settlement_leg per line.
    //    TODO dentro de la misma tx — si una line falla, rollback total.
    const linesForExecution = await client.query<LineForExecution>(
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

    const paymentDate = order.paidAt
      ? order.paidAt.slice(0, 10)
      : new Date().toISOString().slice(0, 10)

    const expensePaymentIds: string[] = []
    const settlementGroupIds: string[] = []

    for (const line of linesForExecution.rows) {
      // Idempotency: si la line ya quedo wired en una corrida previa
      // (e.g. recovery slice 8), skip silencioso.
      if (line.expense_payment_id) continue

      // V1 solo cubre payroll/employee_net_pay. Lines fuera de scope:
      // throw + rollback. (V2 wireara employer_social_security, etc.)
      if (line.source_kind !== 'payroll' || line.obligation_kind !== 'employee_net_pay') {
        throw new PaymentOrderSettlementBlockedError(
          input.orderId,
          'out_of_scope_v1',
          `out_of_scope_v1 (source=${line.source_kind ?? 'null'}, kind=${line.obligation_kind})`,
          line.line_id
        )
      }

      // Resolver expense por (period_id, member_id).
      let expenseId = await resolvePayrollExpenseIdInTx(client, line)

      // Materialize-or-throw: si miss, materializar sincrono (idempotente)
      // y re-lookup. NOTE: el materializer abre su propia tx — eso esta OK
      // porque la materializacion es independiente del path atomico (las
      // expenses que crea son commit'ed antes del re-lookup, y sobreviven
      // un eventual rollback de la mark-paid tx).
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
            throw new PaymentOrderSettlementBlockedError(
              input.orderId,
              'materializer_dead_letter',
              `materializer failed: ${matErr instanceof Error ? matErr.message : String(matErr)}`,
              line.line_id
            )
          }

          expenseId = await resolvePayrollExpenseIdInTx(client, line)
        }

        if (!expenseId) {
          throw new PaymentOrderExpenseUnresolvedError(
            input.orderId,
            line.line_id,
            line.period_id,
            line.beneficiary_id
          )
        }
      }

      // Crear expense_payment + settlement_leg DENTRO de la misma tx.
      try {
        const result = await recordExpensePayment(
          {
            expenseId,
            paymentDate,
            amount: toNum(line.amount),
            currency: line.currency,
            paymentMethod: order.paymentMethod ?? null,
            paymentAccountId: order.sourceAccountId ?? null,
            paymentSource: 'payroll_system',
            settlementConfig: sourcePolicy.settlementConfig,
            reference:
              order.externalReference ?? `order:${order.orderId}/line:${line.line_id}`,
            actorUserId: input.paidBy,
            paymentOrderLineId: line.line_id,
            notes: `TASK-765 atomic mark-paid from order ${order.orderId}`
          },
          client
        )

        expensePaymentIds.push(result.payment.paymentId)

        if (result.payment.settlementGroupId) {
          settlementGroupIds.push(result.payment.settlementGroupId)
        }
      } catch (err) {
        // Wrap cualquier error downstream con contexto de la order para
        // trazabilidad. El rollback ya se garantiza por withTransaction.
        if (err instanceof PaymentOrderSettlementBlockedError) {
          throw err
        }

        throw new PaymentOrderSettlementBlockedError(
          input.orderId,
          'cutover_violation',
          err instanceof Error ? err.message : String(err),
          line.line_id
        )
      }
    }

    // 8. Outbox event finance.payment_order.paid (consumido por
    //    record_expense_payment_from_order como safety net + payslip
    //    delivery TASK-759 + future Teams notification policy).
    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'payment_order',
        aggregateId: order.orderId,
        eventType: 'finance.payment_order.paid',
        payload: {
          orderId: order.orderId,
          paidBy: input.paidBy,
          paidAt: order.paidAt,
          totalAmount: order.totalAmount,
          currency: order.currency,
          externalReference: input.externalReference,
          atomic: true
        }
      },
      client
    )

    return {
      order,
      eventId,
      expensePaymentIds,
      settlementGroupIds,
      auditTransitionId: auditTransition.transitionId
    }
  })

  // Post-commit: drena el pipeline INLINE para que las projections downstream
  // (payslip emails, record_expense_payment safety net, account_balances
  // rematerialization) corran en el response cycle. Cron permanece como
  // safety net via idempotency-by-design.
  await drainOutboxPipelineAfterMarkPaid(input.orderId)

  return result
}
