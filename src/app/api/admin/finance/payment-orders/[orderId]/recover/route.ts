import { NextResponse } from 'next/server'

import { query, withTransaction } from '@/lib/db'
import { can } from '@/lib/entitlements/runtime'
import { recordExpensePayment } from '@/lib/finance/expense-payment-ledger'
import { rematerializeAccountBalancesFromDate } from '@/lib/finance/account-balances'
import {
  PaymentOrderConflictError,
  PaymentOrderExpenseUnresolvedError,
  PaymentOrderMissingSourceAccountError,
  PaymentOrderSettlementBlockedError,
  PaymentOrderValidationError
} from '@/lib/finance/payment-orders/errors'
import { getPaymentOrderWithLines } from '@/lib/finance/payment-orders/list-orders'
import { materializePayrollExpensesForExportedPeriod } from '@/lib/finance/payroll-expense-reactive'
import { recordPaymentOrderStateTransition } from '@/lib/finance/payment-orders/state-transitions-audit'
import { captureWithDomain } from '@/lib/observability/capture'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

// TASK-765 Slice 8 — Recovery endpoint para payment_orders zombie:
// ordenes en `state='paid'` sin expense_payment + settlement_leg
// downstream. Reusa el mismo chain del path atomico (slice 5) pero
// asume estado terminal pre-existente — UPDATE en lugar de transicion
// nueva.
//
// Flujo:
// 1. Auth: requireAdminTenantContext + can(finance.payment_orders.recover).
// 2. Validar precondiciones: order existe + state='paid' + sin
//    expense_payment_id en alguna line.
// 3. Materializar expenses si faltan (idempotente).
// 4. UPDATE source_account_id en payment_orders + propagar a las lines
//    via recordExpensePayment(input, client).
// 5. Audit log append-only con reason='recovery_TASK-765'.
// 6. Publish outbox finance.payment_order.paid (replay) para downstream
//    consumers que se perdieron el original (payslip delivery, Teams
//    notification policies futuras).
// 7. Rematerializar account_balances desde la fecha del paid_at original
//    para que el banco refleje el outflow.
//
// Idempotente: re-llamar con misma orderId post-recovery devuelve
// alreadyRecovered=true sin re-procesar.

interface RecoveryRequestBody {
  sourceAccountId?: unknown
  paidAt?: unknown
  dryRun?: unknown
  reason?: unknown
}

interface RecoveryResponse {
  recovered: boolean
  alreadyRecovered: boolean
  expensePaymentIds: string[]
  settlementGroupIds: string[]
  rematerializedDays: number
  auditTransitionId: string | null
  outboxEventId: string | null
}

interface OrderHeaderRow extends Record<string, unknown> {
  order_id: string
  state: string
  payment_method: string | null
  source_account_id: string | null
  paid_at: string | null
  external_reference: string | null
  total_amount: number | string
  currency: string
}

interface LineForRecovery extends Record<string, unknown> {
  line_id: string
  obligation_id: string
  amount: number | string
  currency: string
  expense_payment_id: string | null
  beneficiary_type: string
  beneficiary_id: string
  obligation_kind: string
  source_kind: string | null
  period_id: string | null
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : 0
  }

  return 0
}

const parseYearMonth = (periodId: string | null): { year: number; month: number } | null => {
  if (!periodId) return null

  const m = periodId.match(/(\d{4})-(\d{1,2})/)

  if (!m) return null

  const year = Number(m[1])
  const month = Number(m[2])

  if (!Number.isInteger(year) || !Number.isInteger(month)) return null
  if (month < 1 || month > 12) return null

  return { year, month }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { tenant, errorResponse } = await requireAdminTenantContext()

  if (!tenant) return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!can(tenant, 'finance.payment_orders.recover', 'update', 'tenant')) {
    return NextResponse.json(
      {
        error: 'No tienes permiso para recuperar payment orders.',
        code: 'forbidden'
      },
      { status: 403 }
    )
  }

  const { orderId } = await params

  try {
    const body = (await request.json().catch(() => ({}))) as RecoveryRequestBody

    const sourceAccountId =
      typeof body?.sourceAccountId === 'string' && body.sourceAccountId.trim()
        ? body.sourceAccountId.trim()
        : null

    if (!sourceAccountId) {
      throw new PaymentOrderValidationError(
        'sourceAccountId requerido para recuperar la orden',
        'validation_error'
      )
    }

    const dryRun = body?.dryRun === true

    const reason =
      typeof body?.reason === 'string' && body.reason.trim()
        ? body.reason.trim()
        : 'recovery_TASK-765'

    // Validar account exists + active.
    const accountRows = await query<{ account_id: string; currency: string; is_active: boolean }>(
      `SELECT account_id, currency, COALESCE(is_active, FALSE) AS is_active
         FROM greenhouse_finance.accounts
        WHERE account_id = $1
        LIMIT 1`,
      [sourceAccountId]
    )

    if (accountRows.length === 0) {
      throw new PaymentOrderValidationError(
        `Cuenta ${sourceAccountId} no existe en greenhouse_finance.accounts`,
        'validation_error',
        404
      )
    }

    if (!accountRows[0].is_active) {
      throw new PaymentOrderValidationError(
        `Cuenta ${sourceAccountId} no esta activa`,
        'validation_error'
      )
    }

    // Cargar order + lines.
    const headerRows = await query<OrderHeaderRow>(
      `SELECT order_id, state, payment_method, source_account_id,
              paid_at::text AS paid_at, external_reference, total_amount, currency
         FROM greenhouse_finance.payment_orders
        WHERE order_id = $1
        LIMIT 1`,
      [orderId]
    )

    if (headerRows.length === 0) {
      throw new PaymentOrderValidationError(`Order ${orderId} no existe`, 'not_found', 404)
    }

    const order = headerRows[0]

    if (order.state !== 'paid') {
      throw new PaymentOrderConflictError(
        `Solo se pueden recuperar ordenes en state='paid'. Estado actual: ${order.state}`,
        'invalid_state_transition'
      )
    }

    if (order.currency !== accountRows[0].currency) {
      throw new PaymentOrderValidationError(
        `Moneda de la cuenta (${accountRows[0].currency}) no coincide con la orden (${order.currency})`,
        'validation_error'
      )
    }

    const lines = await query<LineForRecovery>(
      `SELECT l.line_id, l.obligation_id, l.amount, l.currency, l.expense_payment_id,
              o.beneficiary_type, o.beneficiary_id, o.obligation_kind,
              o.source_kind, o.period_id
         FROM greenhouse_finance.payment_order_lines l
         JOIN greenhouse_finance.payment_obligations o
           ON o.obligation_id = l.obligation_id
        WHERE l.order_id = $1`,
      [orderId]
    )

    const linesNeedingRecovery = lines.filter(l => !l.expense_payment_id)

    if (linesNeedingRecovery.length === 0) {
      // Ya recuperada — idempotency.
      return NextResponse.json({
        recovered: true,
        alreadyRecovered: true,
        expensePaymentIds: [],
        settlementGroupIds: [],
        rematerializedDays: 0,
        auditTransitionId: null,
        outboxEventId: null
      } satisfies RecoveryResponse)
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        order: {
          orderId: order.order_id,
          state: order.state,
          currency: order.currency,
          totalAmount: toNum(order.total_amount),
          currentSourceAccountId: order.source_account_id,
          newSourceAccountId: sourceAccountId,
          paidAt: order.paid_at
        },
        plan: {
          linesToWire: linesNeedingRecovery.length,
          linesAlreadyWired: lines.length - linesNeedingRecovery.length,
          rematerializeFromDate: order.paid_at?.slice(0, 10) ?? null
        }
      })
    }

    // Materializar expenses faltantes (off-tx, idempotente). Un mismo
    // periodo puede aparecer en multiples lines — deduplicar.
    const periodSet = new Set<string>()

    for (const line of linesNeedingRecovery) {
      if (line.period_id) periodSet.add(line.period_id)
    }

    for (const periodId of periodSet) {
      const ym = parseYearMonth(periodId)

      if (!ym) continue

      try {
        await materializePayrollExpensesForExportedPeriod({
          periodId,
          year: ym.year,
          month: ym.month
        })
      } catch (err) {
        captureWithDomain(err, 'finance', {
          tags: {
            source: 'recovery_endpoint_materializer',
            orderId,
            periodId
          }
        })

        // No lanzar — la siguiente fase intentara el lookup; si miss,
        // expense_unresolved se propaga.
      }
    }

    // Recovery atomico: UPDATE order + per-line settlement + audit + outbox.
    const result = await withTransaction(async client => {
      // 1. UPDATE source_account_id.
      await client.query(
        `UPDATE greenhouse_finance.payment_orders
            SET source_account_id = $2, updated_at = now()
          WHERE order_id = $1`,
        [orderId, sourceAccountId]
      )

      // 2. Audit log.
      const audit = await recordPaymentOrderStateTransition(
        {
          orderId,
          // No es transicion de estado — es repair. Pero el log es estado-
          // agnostic, asi que emitimos paid->paid con metadata.path='recovery'.
          fromState: 'paid',
          toState: 'paid',
          actorUserId: tenant.userId,
          reason,
          metadata: {
            path: 'recovery_TASK-765',
            previousSourceAccountId: order.source_account_id,
            newSourceAccountId: sourceAccountId,
            linesWired: linesNeedingRecovery.length
          }
        },
        client
      )

      // 3. Crear expense_payment + settlement_leg per line dentro de la tx.
      const expensePaymentIds: string[] = []
      const settlementGroupIds: string[] = []
      const paymentDate = order.paid_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)

      for (const line of linesNeedingRecovery) {
        if (line.source_kind !== 'payroll' || line.obligation_kind !== 'employee_net_pay') {
          throw new PaymentOrderSettlementBlockedError(
            orderId,
            'out_of_scope_v1',
            `Recovery V1 solo cubre payroll/employee_net_pay. Line ${line.line_id} kind=${line.obligation_kind}`,
            line.line_id
          )
        }

        const expenseRows = await client.query<{ expense_id: string }>(
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

        const expenseId = expenseRows.rows[0]?.expense_id

        if (!expenseId) {
          throw new PaymentOrderExpenseUnresolvedError(
            orderId,
            line.line_id,
            line.period_id,
            line.beneficiary_id
          )
        }

        const recordResult = await recordExpensePayment(
          {
            expenseId,
            paymentDate,
            amount: toNum(line.amount),
            currency: line.currency,
            paymentMethod: order.payment_method ?? null,
            paymentAccountId: sourceAccountId,
            paymentSource: 'payroll_system',
            reference: order.external_reference ?? `recovery:${orderId}/line:${line.line_id}`,
            actorUserId: tenant.userId,
            paymentOrderLineId: line.line_id,
            notes: `TASK-765 Slice 8 recovery from paid order ${orderId}`
          },
          client
        )

        expensePaymentIds.push(recordResult.payment.paymentId)

        if (recordResult.payment.settlementGroupId) {
          settlementGroupIds.push(recordResult.payment.settlementGroupId)
        }
      }

      // 4. Outbox replay event finance.payment_order.paid.
      const eventId = await publishOutboxEvent(
        {
          aggregateType: 'payment_order',
          aggregateId: orderId,
          eventType: 'finance.payment_order.paid',
          payload: {
            orderId,
            paidBy: tenant.userId,
            paidAt: order.paid_at,
            totalAmount: toNum(order.total_amount),
            currency: order.currency,
            externalReference: order.external_reference,
            replay: true,
            recoveryReason: reason
          }
        },
        client
      )

      return {
        expensePaymentIds,
        settlementGroupIds,
        auditTransitionId: audit.transitionId,
        outboxEventId: eventId
      }
    })

    // 5. Rematerializar account_balances post-tx (no requiere tx atomic con
    //    el UPDATE — es un read-side projection refresh).
    let rematerializedDays = 0

    if (order.paid_at) {
      try {
        const balances = await rematerializeAccountBalancesFromDate({
          accountId: sourceAccountId,
          fromDate: order.paid_at.slice(0, 10),
          actorUserId: tenant.userId
        })

        rematerializedDays = balances.length
      } catch (err) {
        captureWithDomain(err, 'finance', {
          tags: {
            source: 'recovery_endpoint_rematerialize',
            orderId,
            sourceAccountId
          }
        })
        // No lanzar — el ledger ya esta correcto a nivel de expense_payment +
        // settlement_leg; account_balances puede rematerializarse luego.
      }
    }

    return NextResponse.json({
      recovered: true,
      alreadyRecovered: false,
      expensePaymentIds: result.expensePaymentIds,
      settlementGroupIds: result.settlementGroupIds,
      rematerializedDays,
      auditTransitionId: result.auditTransitionId,
      outboxEventId: result.outboxEventId
    } satisfies RecoveryResponse)
  } catch (error) {
    if (
      error instanceof PaymentOrderMissingSourceAccountError ||
      error instanceof PaymentOrderSettlementBlockedError ||
      error instanceof PaymentOrderExpenseUnresolvedError ||
      error instanceof PaymentOrderValidationError ||
      error instanceof PaymentOrderConflictError
    ) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      )
    }

    captureWithDomain(error, 'finance', {
      tags: { source: 'recovery_endpoint_unhandled', orderId }
    })

    return NextResponse.json(
      {
        error: 'No fue posible recuperar la orden.',
        code: 'recovery_failed'
      },
      { status: 500 }
    )
  }
}

// Suppress unused warning — getPaymentOrderWithLines is documented as the
// canonical reader for the recovered order; consumers can call it post-recovery
// to display the updated state.
void getPaymentOrderWithLines
