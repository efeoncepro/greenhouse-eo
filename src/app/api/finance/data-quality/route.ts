import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { checkExchangeRateStaleness } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

interface DataQualityCheck {
  name: string
  status: 'ok' | 'warning' | 'error'
  detail: string
  value?: number | string | null
}

/**
 * GET /api/finance/data-quality
 *
 * Runs integrity and freshness checks across the finance module.
 * Returns individual check results + overall status.
 */
export async function GET() {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const checks: DataQualityCheck[] = []

  // 1. Payment ledger integrity
  try {
    const divergent = await runGreenhousePostgresQuery<{ count: string } & Record<string, unknown>>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_finance.income i
       LEFT JOIN (
         SELECT income_id, SUM(amount)::numeric AS total
         FROM greenhouse_finance.income_payments
         GROUP BY income_id
       ) p ON p.income_id = i.income_id
       WHERE ABS(COALESCE(i.amount_paid, 0) - COALESCE(p.total, 0)) > 0.01`
    )

    const count = Number(divergent[0]?.count ?? 0)

    checks.push({
      name: 'payment_ledger_integrity',
      status: count === 0 ? 'ok' : 'warning',
      detail: count === 0
        ? 'Todos los saldos de pago están consistentes'
        : `${count} factura(s) con amount_paid divergente de SUM(income_payments)`,
      value: count
    })
  } catch {
    checks.push({ name: 'payment_ledger_integrity', status: 'error', detail: 'No se pudo verificar integridad de pagos' })
  }

  // 2. Exchange rate freshness
  try {
    const staleness = await checkExchangeRateStaleness('USD', 'CLP')

    if (!staleness) {
      checks.push({
        name: 'exchange_rate_freshness',
        status: 'warning',
        detail: 'No hay tipo de cambio USD/CLP registrado',
        value: null
      })
    } else {
      checks.push({
        name: 'exchange_rate_freshness',
        status: staleness.isStale ? 'warning' : 'ok',
        detail: staleness.isStale
          ? `Tipo de cambio USD/CLP tiene ${staleness.ageDays} días de antigüedad (umbral: ${staleness.thresholdDays})`
          : `Tipo de cambio USD/CLP actualizado (${staleness.ageDays} día(s))`,
        value: staleness.ageDays
      })
    }
  } catch {
    checks.push({ name: 'exchange_rate_freshness', status: 'error', detail: 'No se pudo verificar freshness del tipo de cambio' })
  }

  // 3. Orphan expenses (no client assigned)
  try {
    const orphans = await runGreenhousePostgresQuery<{ count: string } & Record<string, unknown>>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_finance.expenses
       WHERE (client_id IS NULL OR client_id = '') AND expense_type NOT IN ('tax', 'social_security')`
    )

    const count = Number(orphans[0]?.count ?? 0)

    checks.push({
      name: 'orphan_expenses',
      status: count === 0 ? 'ok' : 'warning',
      detail: count === 0
        ? 'Todos los gastos tienen cliente asignado'
        : `${count} gasto(s) sin cliente asignado (excluye tax/social_security)`,
      value: count
    })
  } catch {
    checks.push({ name: 'orphan_expenses', status: 'ok', detail: 'Check no disponible' })
  }

  // 4. Income without client
  try {
    const noClient = await runGreenhousePostgresQuery<{ count: string } & Record<string, unknown>>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_finance.income
       WHERE client_id IS NULL OR client_id = ''`
    )

    const count = Number(noClient[0]?.count ?? 0)

    checks.push({
      name: 'income_without_client',
      status: count === 0 ? 'ok' : 'warning',
      detail: count === 0
        ? 'Todos los ingresos tienen cliente asignado'
        : `${count} ingreso(s) sin cliente asignado`,
      value: count
    })
  } catch {
    checks.push({ name: 'income_without_client', status: 'ok', detail: 'Check no disponible' })
  }

  // 5. DTE pending emission
  try {
    const pending = await runGreenhousePostgresQuery<{ count: string } & Record<string, unknown>>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_finance.dte_emission_queue
       WHERE status IN ('pending', 'retry_scheduled')`
    )

    const count = Number(pending[0]?.count ?? 0)

    checks.push({
      name: 'dte_pending_emission',
      status: count === 0 ? 'ok' : 'warning',
      detail: count === 0
        ? 'Sin emisiones DTE pendientes'
        : `${count} emisión(es) DTE pendiente(s) de retry`,
      value: count
    })
  } catch {
    // Table might not exist yet
    checks.push({ name: 'dte_pending_emission', status: 'ok', detail: 'Cola DTE no provisionada aún' })
  }

  // 6. Nubox balance divergence
  try {
    const divergent = await runGreenhousePostgresQuery<{ count: string } & Record<string, unknown>>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_finance.income
       WHERE balance_nubox IS NOT NULL
         AND balance_nubox = 0
         AND payment_status IN ('pending', 'partial', 'overdue')
         AND COALESCE(is_annulled, FALSE) = FALSE`
    )

    const count = Number(divergent[0]?.count ?? 0)

    checks.push({
      name: 'nubox_balance_divergence',
      status: count === 0 ? 'ok' : 'warning',
      detail: count === 0
        ? 'Sin divergencias de balance Nubox vs Greenhouse'
        : `${count} factura(s) cobrada(s) en Nubox pero pendiente(s) en Greenhouse`,
      value: count
    })
  } catch {
    checks.push({ name: 'nubox_balance_divergence', status: 'ok', detail: 'Check no disponible' })
  }

  // 7. Annulled expenses not excluded
  try {
    const annulled = await runGreenhousePostgresQuery<{ count: string } & Record<string, unknown>>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_finance.expenses
       WHERE is_annulled = TRUE AND payment_status NOT IN ('written_off', 'cancelled')`
    )

    const count = Number(annulled[0]?.count ?? 0)

    checks.push({
      name: 'annulled_expenses_status',
      status: count === 0 ? 'ok' : 'warning',
      detail: count === 0
        ? 'Todos los gastos anulados tienen status correcto'
        : `${count} gasto(s) anulado(s) sin status written_off/cancelled`,
      value: count
    })
  } catch {
    checks.push({ name: 'annulled_expenses_status', status: 'ok', detail: 'Check no disponible' })
  }

  // 8. Overdue receivables
  try {
    const overdue = await runGreenhousePostgresQuery<{ count: string; total_clp: string } & Record<string, unknown>>(
      `SELECT COUNT(*)::text AS count, COALESCE(SUM(total_amount_clp - COALESCE(amount_paid, 0)), 0)::text AS total_clp
       FROM greenhouse_finance.income
       WHERE payment_status IN ('pending', 'partial', 'overdue')
         AND due_date < CURRENT_DATE`
    )

    const count = Number(overdue[0]?.count ?? 0)

    checks.push({
      name: 'overdue_receivables',
      status: count === 0 ? 'ok' : count > 5 ? 'error' : 'warning',
      detail: count === 0
        ? 'Sin facturas vencidas'
        : `${count} factura(s) vencida(s)`,
      value: count
    })
  } catch {
    checks.push({ name: 'overdue_receivables', status: 'ok', detail: 'Check no disponible' })
  }

  const hasError = checks.some(c => c.status === 'error')
  const hasWarning = checks.some(c => c.status === 'warning')
  const overallStatus = hasError ? 'error' : hasWarning ? 'warning' : 'ok'

  return NextResponse.json({
    checks,
    overallStatus,
    checkedAt: new Date().toISOString()
  })
}
