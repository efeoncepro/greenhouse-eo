// TASK-765 Slice 8 — Recovery script para las 2 ordenes zombie del
// incidente 2026-05-01. Usa el mismo helper interno que el endpoint
// admin pero corre directo via tsx (evita autenticacion HTTP).
//
// Idempotente: re-llamar con misma orderId post-recovery devuelve
// alreadyRecovered=true sin duplicar.
//
// Uso:
//   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
//     scripts/finance/task-765-recover-incident-orders.ts [--dry-run]

import { withTransaction } from '@/lib/db'
import { recordExpensePayment } from '@/lib/finance/expense-payment-ledger'
import { recordPaymentOrderStateTransition } from '@/lib/finance/payment-orders/state-transitions-audit'
import { materializePayrollExpensesForExportedPeriod } from '@/lib/finance/payroll-expense-reactive'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

const ZOMBIE_ORDERS = [
  {
    orderId: 'por-66563173-bdda-4591-b9ef-f798ecc98b95',
    label: 'Luis Reyes — Nomina 2026-04',
    expectedAmount: 148312.5,
    expectedMember: 'luis-reyes'
  },
  {
    orderId: 'por-596043bd-1e80-4d9f-a932-515d44750b2e',
    label: 'Humberly Henriquez — Nomina 2026-04',
    expectedAmount: 254250.0,
    expectedMember: 'humberly-henriquez'
  }
] as const

const SOURCE_ACCOUNT_ID = 'santander-clp' // confirmado por usuario
const ACTOR_USER_ID = 'system:recovery_TASK-765'
const REASON = 'recovery_TASK-765_incident_2026-05-01'

interface OrderRow extends Record<string, unknown> {
  order_id: string
  state: string
  payment_method: string | null
  source_account_id: string | null
  paid_at: string | null
  external_reference: string | null
  total_amount: number | string
  currency: string
}

interface LineRow extends Record<string, unknown> {
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

const DRY_RUN = process.argv.includes('--dry-run')

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return Number(v) || 0

  return 0
}

const recoverOne = async (orderId: string, label: string) => {
  console.log(`\n=== ${label} (${orderId}) ===`)

  const headerRows = await runGreenhousePostgresQuery<OrderRow>(
    `SELECT order_id, state, payment_method, source_account_id,
            paid_at::text AS paid_at, external_reference, total_amount, currency
       FROM greenhouse_finance.payment_orders
      WHERE order_id = $1`,
    [orderId]
  )

  if (headerRows.length === 0) {
    console.log('  ❌ Order no existe')

    return
  }

  const order = headerRows[0]

  console.log(`  state=${order.state} source_account=${order.source_account_id ?? 'NULL'}`)

  if (order.state !== 'paid') {
    console.log(`  ⏭  Skip: state='${order.state}' (esperaba 'paid')`)

    return
  }

  const lines = await runGreenhousePostgresQuery<LineRow>(
    `SELECT l.line_id, l.obligation_id, l.amount, l.currency, l.expense_payment_id,
            o.beneficiary_type, o.beneficiary_id, o.obligation_kind, o.source_kind, o.period_id
       FROM greenhouse_finance.payment_order_lines l
       JOIN greenhouse_finance.payment_obligations o ON o.obligation_id = l.obligation_id
      WHERE l.order_id = $1`,
    [orderId]
  )

  const needs = lines.filter(l => !l.expense_payment_id)

  console.log(`  lines: ${lines.length} total, ${needs.length} need recovery`)

  if (needs.length === 0) {
    console.log('  ✅ Ya recuperada (alreadyRecovered)')

    return
  }

  if (DRY_RUN) {
    console.log(`  🔎 DRY-RUN: ${needs.length} lines wireables, source_account=${SOURCE_ACCOUNT_ID}`)

    return
  }

  // Materializar expenses faltantes.
  const periods = new Set<string>()

  for (const line of needs) if (line.period_id) periods.add(line.period_id)

  for (const periodId of periods) {
    const m = periodId.match(/(\d{4})-(\d{1,2})/)

    if (!m) continue

    const year = Number(m[1])
    const month = Number(m[2])

    try {
      const result = await materializePayrollExpensesForExportedPeriod({
        periodId,
        year,
        month
      })

      console.log(`  materializer ${periodId}: created=${result.payrollCreated} skipped=${result.payrollSkipped}`)
    } catch (err) {
      console.error(`  ⚠️  materializer ${periodId} fallo:`, err)
    }
  }

  // Recovery atomic.
  const result = await withTransaction(async client => {
    await client.query(
      `UPDATE greenhouse_finance.payment_orders
          SET source_account_id = $2, updated_at = now()
        WHERE order_id = $1`,
      [orderId, SOURCE_ACCOUNT_ID]
    )

    const audit = await recordPaymentOrderStateTransition(
      {
        orderId,
        fromState: 'paid',
        toState: 'paid',
        actorUserId: ACTOR_USER_ID,
        reason: REASON,
        metadata: {
          path: 'recovery_TASK-765',
          previousSourceAccountId: order.source_account_id,
          newSourceAccountId: SOURCE_ACCOUNT_ID,
          linesWired: needs.length
        }
      },
      client
    )

    const expensePaymentIds: string[] = []
    const paymentDate = order.paid_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)

    for (const line of needs) {
      const expenseRows = await client.query<{ expense_id: string }>(
        `SELECT expense_id FROM greenhouse_finance.expenses
          WHERE payroll_period_id = $1 AND member_id = $2
            AND expense_type = 'payroll' AND source_type = 'payroll_generated'
            AND COALESCE(is_annulled, FALSE) = FALSE
          ORDER BY created_at DESC LIMIT 1`,
        [line.period_id, line.beneficiary_id]
      )

      const expenseId = expenseRows.rows[0]?.expense_id

      if (!expenseId) {
        throw new Error(
          `expense_unresolved: period=${line.period_id} member=${line.beneficiary_id}`
        )
      }

      const r = await recordExpensePayment(
        {
          expenseId,
          paymentDate,
          amount: toNum(line.amount),
          currency: line.currency,
          paymentMethod: order.payment_method ?? 'bank_transfer',
          paymentAccountId: SOURCE_ACCOUNT_ID,
          paymentSource: 'payroll_system',
          reference: order.external_reference ?? `recovery:${orderId}/line:${line.line_id}`,
          actorUserId: ACTOR_USER_ID,
          paymentOrderLineId: line.line_id,
          notes: `TASK-765 Slice 8 recovery from paid order ${orderId}`
        },
        client
      )

      expensePaymentIds.push(r.payment.paymentId)
    }

    const eventId = await publishOutboxEvent(
      {
        aggregateType: 'payment_order',
        aggregateId: orderId,
        eventType: 'finance.payment_order.paid',
        payload: {
          orderId,
          paidBy: ACTOR_USER_ID,
          paidAt: order.paid_at,
          totalAmount: toNum(order.total_amount),
          currency: order.currency,
          externalReference: order.external_reference,
          replay: true,
          recoveryReason: REASON
        }
      },
      client
    )

    return { expensePaymentIds, auditTransitionId: audit.transitionId, outboxEventId: eventId }
  })

  console.log(`  ✅ tx commit: expense_payments=${result.expensePaymentIds.length} audit=${result.auditTransitionId} outbox=${result.outboxEventId}`)
  console.log(`  ⏭  rematerialize account_balances pendiente — correr 'pnpm finance:rematerialize-balances' apuntando a ${SOURCE_ACCOUNT_ID}`)
}

const main = async () => {
  console.log(`TASK-765 Slice 8 — Recovery del incidente 2026-05-01 (${DRY_RUN ? 'DRY-RUN' : 'APPLY'})`)
  console.log(`Cuenta origen: ${SOURCE_ACCOUNT_ID}`)

  for (const o of ZOMBIE_ORDERS) {
    try {
      await recoverOne(o.orderId, o.label)
    } catch (err) {
      console.error(`  ❌ ERROR recovery:`, err)
    }
  }

  console.log('\n=== Verificacion final ===')

  const verify = await runGreenhousePostgresQuery<{
    order_id: string
    state: string
    source_account_id: string | null
    expense_payment_count: string
  }>(
    `SELECT po.order_id, po.state, po.source_account_id,
            COUNT(pol.expense_payment_id) FILTER (WHERE pol.expense_payment_id IS NOT NULL)::text AS expense_payment_count
       FROM greenhouse_finance.payment_orders po
       LEFT JOIN greenhouse_finance.payment_order_lines pol ON pol.order_id = po.order_id
      WHERE po.order_id = ANY($1::text[])
      GROUP BY po.order_id, po.state, po.source_account_id
      ORDER BY po.order_id`,
    [ZOMBIE_ORDERS.map(o => o.orderId)]
  )

  for (const row of verify) {
    console.log(
      `  ${row.order_id}: state=${row.state} source=${row.source_account_id ?? 'NULL'} expense_payments=${row.expense_payment_count}`
    )
  }

  process.exit(0)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
