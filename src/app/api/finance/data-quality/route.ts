import { NextResponse } from 'next/server'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'
import { checkExchangeRateStaleness } from '@/lib/finance/shared'

export const dynamic = 'force-dynamic'

type DataQualityCheckStatus = 'ok' | 'warning' | 'error'
type DataQualityCheckCategory =
  | 'ledger_integrity'
  | 'settlement_orchestration'
  | 'freshness'
  | 'allocation_policy'
  | 'document_pipeline'
  | 'receivables_risk'
type DataQualityCheckScope = 'global' | 'tenant'

interface DataQualityCheck {
  name: string
  status: DataQualityCheckStatus
  detail: string
  value?: number | string | null
  category: DataQualityCheckCategory
  scope: DataQualityCheckScope
}

interface FinanceDataQualitySummaryBucket {
  key: string
  label: string
  status: DataQualityCheckStatus
  count: number
  scope: DataQualityCheckScope
}

interface ScopedPaymentLedgerAudit {
  incomeLedgerDriftCount: number
  incomePaidWithoutLedgerCount: number
  expenseLedgerDriftCount: number
  expensePaidWithoutLedgerCount: number
}

type CountRow = { count: string } & Record<string, unknown>
type AllocationCountsRow = {
  direct_without_client: string
  shared_unallocated: string
} & Record<string, unknown>

const toCount = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

const countRows = async (sql: string, params: unknown[] = []) => {
  const rows = await runGreenhousePostgresQuery<CountRow>(sql, params)

  return toCount(rows[0]?.count)
}

const buildSpaceCondition = ({
  alias,
  startIndex,
  spaceId
}: {
  alias: string
  startIndex: number
  spaceId: string | null
}) => {
  if (!spaceId) {
    return { clause: '', params: [] as unknown[], scope: 'global' as const }
  }

  return {
    clause: ` AND ${alias}.space_id = $${startIndex}`,
    params: [spaceId],
    scope: 'tenant' as const
  }
}

const pluralize = (count: number, singular: string, plural: string) => `${count} ${count === 1 ? singular : plural}`

const describeSummaryBucket = (bucket: FinanceDataQualitySummaryBucket) => {
  switch (bucket.key) {
    case 'payment_ledger_integrity':
      return pluralize(bucket.count, 'drift de ledger', 'drifts de ledger')
    case 'direct_cost_without_client':
      return pluralize(bucket.count, 'costo directo sin cliente', 'costos directos sin cliente')
    case 'overdue_receivables':
      return pluralize(bucket.count, 'cuenta por cobrar vencida', 'cuentas por cobrar vencidas')
    default:
      return `${bucket.count} ${bucket.label}`
  }
}

const summarizeFinanceBuckets = (buckets: FinanceDataQualitySummaryBucket[]) => {
  const issueBuckets = buckets.filter(bucket => bucket.status === 'warning' || bucket.status === 'error')
  const sharedOverheadBucket = buckets.find(bucket => bucket.key === 'shared_overhead_unallocated')

  if (issueBuckets.length === 0) {
    if (!sharedOverheadBucket || sharedOverheadBucket.count === 0) {
      return 'Sin issues activos en ledger, asignación directa ni cartera vencida.'
    }

    return `${pluralize(sharedOverheadBucket.count, 'overhead compartido', 'overheads compartidos')} siguen sin asignación explícita; estado permitido.`
  }

  const issueParts = issueBuckets.map(describeSummaryBucket)

  const allowedOverheadSummary =
    sharedOverheadBucket && sharedOverheadBucket.count > 0
      ? ` Además, ${pluralize(sharedOverheadBucket.count, 'overhead compartido', 'overheads compartidos')} siguen sin asignación explícita; estado permitido.`
      : ''

  return `${pluralize(issueBuckets.length, 'bucket con issue activo', 'buckets con issue activo')}: ${issueParts.join(', ')}.${allowedOverheadSummary}`
}

const buildSummaryBuckets = (checks: DataQualityCheck[]): FinanceDataQualitySummaryBucket[] => {
  const findCount = (name: string) => toCount(checks.find(check => check.name === name)?.value)
  const directCostWithoutClient = checks.find(check => check.name === 'direct_cost_without_client')
  const sharedOverheadUnallocated = checks.find(check => check.name === 'shared_overhead_unallocated')
  const overdueReceivables = checks.find(check => check.name === 'overdue_receivables')

  const ledgerChecks = checks.filter(check =>
    [
      'income_payment_ledger_integrity',
      'income_paid_without_ledger',
      'expense_payment_ledger_integrity',
      'expense_paid_without_ledger'
    ].includes(check.name)
  )

  const ledgerIssueCount = ledgerChecks.reduce((sum, check) => sum + toCount(check.value), 0)

  const ledgerStatus: DataQualityCheckStatus =
    ledgerChecks.some(check => check.status === 'error')
      ? 'error'
      : ledgerChecks.some(check => check.status === 'warning')
        ? 'warning'
        : 'ok'

  return [
    {
      key: 'payment_ledger_integrity',
      label: 'drift de ledger',
      status: ledgerStatus,
      count: ledgerIssueCount,
      scope: ledgerChecks.some(check => check.scope === 'tenant') ? 'tenant' : 'global'
    },
    {
      key: 'direct_cost_without_client',
      label: 'costo directo sin cliente',
      status: directCostWithoutClient?.status ?? 'ok',
      count: findCount('direct_cost_without_client'),
      scope: directCostWithoutClient?.scope ?? 'global'
    },
    {
      key: 'overdue_receivables',
      label: 'cuenta por cobrar vencida',
      status: overdueReceivables?.status ?? 'ok',
      count: findCount('overdue_receivables'),
      scope: overdueReceivables?.scope ?? 'global'
    },
    {
      key: 'shared_overhead_unallocated',
      label: 'overhead compartido sin asignación explícita',
      status: sharedOverheadUnallocated?.status ?? 'ok',
      count: findCount('shared_overhead_unallocated'),
      scope: sharedOverheadUnallocated?.scope ?? 'global'
    }
  ]
}

const auditScopedPaymentLedgers = async (spaceId: string | null): Promise<ScopedPaymentLedgerAudit> => {
  const incomeScope = buildSpaceCondition({ alias: 'i', startIndex: 1, spaceId })
  const expenseScope = buildSpaceCondition({ alias: 'e', startIndex: 1, spaceId })

  const [
    incomeLedgerDriftCount,
    incomePaidWithoutLedgerCount,
    expenseLedgerDriftCount,
    expensePaidWithoutLedgerCount
  ] = await Promise.all([
    countRows(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_finance.income i
       INNER JOIN (
         SELECT income_id, SUM(amount)::numeric AS total
         FROM greenhouse_finance.income_payments
         GROUP BY income_id
       ) p ON p.income_id = i.income_id
       WHERE ABS(COALESCE(i.amount_paid, 0) - p.total) > 0.01${incomeScope.clause}`,
      incomeScope.params
    ),
    countRows(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_finance.income i
       LEFT JOIN greenhouse_finance.income_payments ip ON ip.income_id = i.income_id
       WHERE COALESCE(i.amount_paid, 0) > 0.01
         AND ip.payment_id IS NULL${incomeScope.clause}`,
      incomeScope.params
    ),
    countRows(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_finance.expenses e
       INNER JOIN (
         SELECT expense_id, SUM(amount)::numeric AS total
         FROM greenhouse_finance.expense_payments
         GROUP BY expense_id
       ) p ON p.expense_id = e.expense_id
       WHERE ABS(COALESCE(e.amount_paid, 0) - p.total) > 0.01${expenseScope.clause}`,
      expenseScope.params
    ),
    countRows(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_finance.expenses e
       LEFT JOIN greenhouse_finance.expense_payments ep ON ep.expense_id = e.expense_id
       WHERE COALESCE(e.amount_paid, 0) > 0.01
         AND ep.payment_id IS NULL${expenseScope.clause}`,
      expenseScope.params
    )
  ])

  return {
    incomeLedgerDriftCount,
    incomePaidWithoutLedgerCount,
    expenseLedgerDriftCount,
    expensePaidWithoutLedgerCount
  }
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
  const tenantSpaceId = tenant.spaceId ?? null

  // 1. Payment ledger integrity
  try {
    const audit = await auditScopedPaymentLedgers(tenantSpaceId)
    const scope: DataQualityCheckScope = tenantSpaceId ? 'tenant' : 'global'

    checks.push({
      name: 'income_payment_ledger_integrity',
      category: 'ledger_integrity',
      scope,
      status: audit.incomeLedgerDriftCount === 0 ? 'ok' : 'warning',
      detail: audit.incomeLedgerDriftCount === 0
        ? 'Todos los saldos de pago están consistentes'
        : `${audit.incomeLedgerDriftCount} factura(s) con amount_paid divergente de SUM(income_payments)`,
      value: audit.incomeLedgerDriftCount
    })

    checks.push({
      name: 'income_paid_without_ledger',
      category: 'ledger_integrity',
      scope,
      status: audit.incomePaidWithoutLedgerCount === 0 ? 'ok' : 'warning',
      detail: audit.incomePaidWithoutLedgerCount === 0
        ? 'No hay facturas marcadas como cobradas sin evento de cobro'
        : `${audit.incomePaidWithoutLedgerCount} factura(s) con amount_paid > 0 y sin filas en income_payments`,
      value: audit.incomePaidWithoutLedgerCount
    })

    checks.push({
      name: 'expense_payment_ledger_integrity',
      category: 'ledger_integrity',
      scope,
      status: audit.expenseLedgerDriftCount === 0 ? 'ok' : 'warning',
      detail: audit.expenseLedgerDriftCount === 0
        ? 'Todos los saldos de pagos de compras están consistentes'
        : `${audit.expenseLedgerDriftCount} compra(s) con amount_paid divergente de SUM(expense_payments)`,
      value: audit.expenseLedgerDriftCount
    })

    checks.push({
      name: 'expense_paid_without_ledger',
      category: 'ledger_integrity',
      scope,
      status: audit.expensePaidWithoutLedgerCount === 0 ? 'ok' : 'warning',
      detail: audit.expensePaidWithoutLedgerCount === 0
        ? 'No hay compras marcadas como pagadas sin evento de pago'
        : `${audit.expensePaidWithoutLedgerCount} compra(s) con amount_paid > 0 y sin filas en expense_payments`,
      value: audit.expensePaidWithoutLedgerCount
    })
  } catch {
    const scope: DataQualityCheckScope = tenantSpaceId ? 'tenant' : 'global'

    checks.push({
      name: 'income_payment_ledger_integrity',
      category: 'ledger_integrity',
      scope,
      status: 'error',
      detail: 'No se pudo verificar integridad de cobros'
    })
    checks.push({
      name: 'income_paid_without_ledger',
      category: 'ledger_integrity',
      scope,
      status: 'error',
      detail: 'No se pudo verificar cobros faltantes en ledger'
    })
    checks.push({
      name: 'expense_payment_ledger_integrity',
      category: 'ledger_integrity',
      scope,
      status: 'error',
      detail: 'No se pudo verificar integridad de pagos'
    })
    checks.push({
      name: 'expense_paid_without_ledger',
      category: 'ledger_integrity',
      scope,
      status: 'error',
      detail: 'No se pudo verificar pagos faltantes en ledger'
    })
  }

  // 1b. Settlement orchestration consistency
  try {
    const [orphanSettlementGroups, unsettledIncome, unsettledExpense, reconciledPeriodDrift] = await Promise.all([
      runGreenhousePostgresQuery<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM greenhouse_finance.settlement_groups sg
          WHERE NOT EXISTS (
            SELECT 1
            FROM greenhouse_finance.settlement_legs sl
            WHERE sl.settlement_group_id = sg.settlement_group_id
          )
        `
      ).catch(() => [{ count: '0' }]),
      runGreenhousePostgresQuery<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM greenhouse_finance.income_payments ip
          WHERE ip.settlement_group_id IS NOT NULL
            AND ip.is_reconciled = TRUE
            AND NOT EXISTS (
              SELECT 1
              FROM greenhouse_finance.settlement_legs sl
              WHERE sl.linked_payment_type = 'income_payment'
                AND sl.linked_payment_id = ip.payment_id
                AND sl.is_reconciled = TRUE
            )
        `
      ).catch(() => [{ count: '0' }]),
      runGreenhousePostgresQuery<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM greenhouse_finance.expense_payments ep
          WHERE ep.settlement_group_id IS NOT NULL
            AND ep.is_reconciled = TRUE
            AND NOT EXISTS (
              SELECT 1
              FROM greenhouse_finance.settlement_legs sl
              WHERE sl.linked_payment_type = 'expense_payment'
                AND sl.linked_payment_id = ep.payment_id
                AND sl.is_reconciled = TRUE
            )
        `
      ).catch(() => [{ count: '0' }]),
      runGreenhousePostgresQuery<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM greenhouse_finance.reconciliation_periods rp
          WHERE rp.status IN ('reconciled', 'closed')
            AND EXISTS (
              SELECT 1
              FROM greenhouse_finance.bank_statement_rows bsr
              WHERE bsr.period_id = rp.period_id
                AND bsr.match_status IN ('unmatched', 'suggested')
            )
        `
      ).catch(() => [{ count: '0' }])
    ])

    checks.push({
      name: 'settlement_groups_without_legs',
      category: 'settlement_orchestration',
      scope: 'global',
      status: Number(orphanSettlementGroups[0]?.count ?? 0) === 0 ? 'ok' : 'warning',
      detail: Number(orphanSettlementGroups[0]?.count ?? 0) === 0
        ? 'Todos los settlement groups tienen al menos un leg'
        : `${orphanSettlementGroups[0]?.count ?? 0} settlement group(s) sin settlement legs`,
      value: Number(orphanSettlementGroups[0]?.count ?? 0)
    })

    checks.push({
      name: 'income_settlement_leg_drift',
      category: 'settlement_orchestration',
      scope: 'global',
      status: Number(unsettledIncome[0]?.count ?? 0) === 0 ? 'ok' : 'warning',
      detail: Number(unsettledIncome[0]?.count ?? 0) === 0
        ? 'Cobros reconciliados alineados con settlement legs'
        : `${unsettledIncome[0]?.count ?? 0} cobro(s) reconciliado(s) sin leg reconciliado`,
      value: Number(unsettledIncome[0]?.count ?? 0)
    })

    checks.push({
      name: 'expense_settlement_leg_drift',
      category: 'settlement_orchestration',
      scope: 'global',
      status: Number(unsettledExpense[0]?.count ?? 0) === 0 ? 'ok' : 'warning',
      detail: Number(unsettledExpense[0]?.count ?? 0) === 0
        ? 'Pagos reconciliados alineados con settlement legs'
        : `${unsettledExpense[0]?.count ?? 0} pago(s) reconciliado(s) sin leg reconciliado`,
      value: Number(unsettledExpense[0]?.count ?? 0)
    })

    checks.push({
      name: 'reconciled_period_with_pending_rows',
      category: 'settlement_orchestration',
      scope: 'global',
      status: Number(reconciledPeriodDrift[0]?.count ?? 0) === 0 ? 'ok' : 'warning',
      detail: Number(reconciledPeriodDrift[0]?.count ?? 0) === 0
        ? 'No hay períodos cerrados/reconciliados con filas pendientes'
        : `${reconciledPeriodDrift[0]?.count ?? 0} período(s) reconciliado(s)/cerrado(s) con filas pendientes`,
      value: Number(reconciledPeriodDrift[0]?.count ?? 0)
    })
  } catch {
    checks.push({
      name: 'settlement_groups_without_legs',
      category: 'settlement_orchestration',
      scope: 'global',
      status: 'error',
      detail: 'No se pudo verificar settlement groups'
    })
    checks.push({
      name: 'income_settlement_leg_drift',
      category: 'settlement_orchestration',
      scope: 'global',
      status: 'error',
      detail: 'No se pudo verificar drift entre cobros y settlement legs'
    })
    checks.push({
      name: 'expense_settlement_leg_drift',
      category: 'settlement_orchestration',
      scope: 'global',
      status: 'error',
      detail: 'No se pudo verificar drift entre pagos y settlement legs'
    })
    checks.push({
      name: 'reconciled_period_with_pending_rows',
      category: 'settlement_orchestration',
      scope: 'global',
      status: 'error',
      detail: 'No se pudo verificar períodos conciliados con filas pendientes'
    })
  }

  // 2. Exchange rate freshness
  try {
    const staleness = await checkExchangeRateStaleness('USD', 'CLP')

    if (!staleness) {
      checks.push({
        name: 'exchange_rate_freshness',
        category: 'freshness',
        scope: 'global',
        status: 'warning',
        detail: 'No hay tipo de cambio USD/CLP registrado',
        value: null
      })
    } else {
      checks.push({
        name: 'exchange_rate_freshness',
        category: 'freshness',
        scope: 'global',
        status: staleness.isStale ? 'warning' : 'ok',
        detail: staleness.isStale
          ? `Tipo de cambio USD/CLP tiene ${staleness.ageDays} días de antigüedad (umbral: ${staleness.thresholdDays})`
          : `Tipo de cambio USD/CLP actualizado (${staleness.ageDays} día(s))`,
        value: staleness.ageDays
      })
    }
  } catch {
    checks.push({
      name: 'exchange_rate_freshness',
      category: 'freshness',
      scope: 'global',
      status: 'error',
      detail: 'No se pudo verificar freshness del tipo de cambio'
    })
  }

  // 3. Allocation policy — direct cost without client vs allowed shared overhead
  try {
    const spaceScope = buildSpaceCondition({ alias: 'e', startIndex: 1, spaceId: tenantSpaceId })

    const rows = await runGreenhousePostgresQuery<AllocationCountsRow>(
      `SELECT
         COUNT(*) FILTER (
           WHERE COALESCE(e.cost_is_direct, FALSE) = TRUE
             AND COALESCE(NULLIF(e.allocated_client_id, ''), NULLIF(e.client_id, '')) IS NULL
         )::text AS direct_without_client,
         COUNT(*) FILTER (
           WHERE COALESCE(e.cost_is_direct, FALSE) = FALSE
             AND COALESCE(NULLIF(e.allocated_client_id, ''), NULLIF(e.client_id, '')) IS NULL
         )::text AS shared_unallocated
       FROM greenhouse_finance.expenses e
       WHERE COALESCE(e.is_annulled, FALSE) = FALSE
         AND e.expense_type NOT IN ('tax', 'social_security')${spaceScope.clause}`,
      spaceScope.params
    )

    const directWithoutClientCount = toCount(rows[0]?.direct_without_client)
    const sharedUnallocatedCount = toCount(rows[0]?.shared_unallocated)
    const scope = tenantSpaceId ? 'tenant' : 'global'

    checks.push({
      name: 'direct_cost_without_client',
      category: 'allocation_policy',
      scope,
      status: directWithoutClientCount === 0 ? 'ok' : 'warning',
      detail: directWithoutClientCount === 0
        ? 'No hay costos directos sin cliente asignado'
        : `${directWithoutClientCount} gasto(s) directos sin cliente asignado`,
      value: directWithoutClientCount
    })

    checks.push({
      name: 'shared_overhead_unallocated',
      category: 'allocation_policy',
      scope,
      status: 'ok',
      detail: sharedUnallocatedCount === 0
        ? 'No hay overhead compartido pendiente de asignación explícita'
        : `${sharedUnallocatedCount} gasto(s) de overhead compartido siguen sin asignación explícita; estado permitido`,
      value: sharedUnallocatedCount
    })
  } catch {
    const scope: DataQualityCheckScope = tenantSpaceId ? 'tenant' : 'global'

    checks.push({
      name: 'direct_cost_without_client',
      category: 'allocation_policy',
      scope,
      status: 'error',
      detail: 'No se pudo verificar costos directos sin cliente'
    })
    checks.push({
      name: 'shared_overhead_unallocated',
      category: 'allocation_policy',
      scope,
      status: 'error',
      detail: 'No se pudo verificar overhead compartido no asignado'
    })
  }

  // 4. Income without client
  try {
    const spaceScope = buildSpaceCondition({ alias: 'i', startIndex: 1, spaceId: tenantSpaceId })

    const noClient = await runGreenhousePostgresQuery<CountRow>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_finance.income i
       WHERE client_id IS NULL OR client_id = ''${spaceScope.clause}`,
      spaceScope.params
    )

    const count = Number(noClient[0]?.count ?? 0)

    checks.push({
      name: 'income_without_client',
      category: 'allocation_policy',
      scope: tenantSpaceId ? 'tenant' : 'global',
      status: count === 0 ? 'ok' : 'warning',
      detail: count === 0
        ? 'Todos los ingresos tienen cliente asignado'
        : `${count} ingreso(s) sin cliente asignado`,
      value: count
    })
  } catch {
    checks.push({
      name: 'income_without_client',
      category: 'allocation_policy',
      scope: tenantSpaceId ? 'tenant' : 'global',
      status: 'error',
      detail: 'No se pudo verificar ingresos sin cliente'
    })
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
      category: 'document_pipeline',
      scope: 'global',
      status: count === 0 ? 'ok' : 'warning',
      detail: count === 0
        ? 'Sin emisiones DTE pendientes'
        : `${count} emisión(es) DTE pendiente(s) de retry`,
      value: count
    })
  } catch {
    // Table might not exist yet
    checks.push({
      name: 'dte_pending_emission',
      category: 'document_pipeline',
      scope: 'global',
      status: 'ok',
      detail: 'Cola DTE no provisionada aún'
    })
  }

  // 6. Nubox balance divergence
  try {
    const spaceScope = buildSpaceCondition({ alias: 'i', startIndex: 1, spaceId: tenantSpaceId })

    const divergent = await runGreenhousePostgresQuery<CountRow>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_finance.income i
       WHERE balance_nubox IS NOT NULL
         AND balance_nubox = 0
         AND payment_status IN ('pending', 'partial', 'overdue')
         AND COALESCE(is_annulled, FALSE) = FALSE${spaceScope.clause}`,
      spaceScope.params
    )

    const count = Number(divergent[0]?.count ?? 0)

    checks.push({
      name: 'nubox_balance_divergence',
      category: 'receivables_risk',
      scope: tenantSpaceId ? 'tenant' : 'global',
      status: count === 0 ? 'ok' : 'warning',
      detail: count === 0
        ? 'Sin divergencias de balance Nubox vs Greenhouse'
        : `${count} factura(s) cobrada(s) en Nubox pero pendiente(s) en Greenhouse`,
      value: count
    })
  } catch {
    checks.push({
      name: 'nubox_balance_divergence',
      category: 'receivables_risk',
      scope: tenantSpaceId ? 'tenant' : 'global',
      status: 'error',
      detail: 'No se pudo verificar divergencia de balance Nubox'
    })
  }

  // 7. Annulled expenses not excluded
  try {
    const spaceScope = buildSpaceCondition({ alias: 'e', startIndex: 1, spaceId: tenantSpaceId })

    const annulled = await runGreenhousePostgresQuery<CountRow>(
      `SELECT COUNT(*)::text AS count
       FROM greenhouse_finance.expenses e
       WHERE is_annulled = TRUE AND payment_status NOT IN ('written_off', 'cancelled')${spaceScope.clause}`,
      spaceScope.params
    )

    const count = Number(annulled[0]?.count ?? 0)

    checks.push({
      name: 'annulled_expenses_status',
      category: 'allocation_policy',
      scope: tenantSpaceId ? 'tenant' : 'global',
      status: count === 0 ? 'ok' : 'warning',
      detail: count === 0
        ? 'Todos los gastos anulados tienen status correcto'
        : `${count} gasto(s) anulado(s) sin status written_off/cancelled`,
      value: count
    })
  } catch {
    checks.push({
      name: 'annulled_expenses_status',
      category: 'allocation_policy',
      scope: tenantSpaceId ? 'tenant' : 'global',
      status: 'error',
      detail: 'No se pudo verificar status de gastos anulados'
    })
  }

  // 8. Statement import idempotency guardrails
  try {
    const [missingImportedFingerprintRows, duplicateImportedFingerprints] = await Promise.all([
      runGreenhousePostgresQuery<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM greenhouse_finance.bank_statement_rows
          WHERE source_import_batch_id IS NOT NULL
            AND (source_import_fingerprint IS NULL OR source_import_fingerprint = '')
        `
      ).catch(() => [{ count: '0' }]),
      runGreenhousePostgresQuery<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM (
            SELECT period_id, source_import_fingerprint
            FROM greenhouse_finance.bank_statement_rows
            WHERE source_import_batch_id IS NOT NULL
              AND source_import_fingerprint IS NOT NULL
            GROUP BY period_id, source_import_fingerprint
            HAVING COUNT(*) > 1
          ) duplicates
        `
      ).catch(() => [{ count: '0' }])
    ])

    checks.push({
      name: 'statement_import_missing_fingerprint',
      category: 'document_pipeline',
      scope: 'global',
      status: Number(missingImportedFingerprintRows[0]?.count ?? 0) === 0 ? 'ok' : 'warning',
      detail: Number(missingImportedFingerprintRows[0]?.count ?? 0) === 0
        ? 'Todos los imports nuevos tienen fingerprint determinístico'
        : `${missingImportedFingerprintRows[0]?.count ?? 0} fila(s) importada(s) sin fingerprint`,
      value: Number(missingImportedFingerprintRows[0]?.count ?? 0)
    })

    checks.push({
      name: 'statement_import_duplicate_fingerprint',
      category: 'document_pipeline',
      scope: 'global',
      status: Number(duplicateImportedFingerprints[0]?.count ?? 0) === 0 ? 'ok' : 'warning',
      detail: Number(duplicateImportedFingerprints[0]?.count ?? 0) === 0
        ? 'No hay duplicados de import en statements'
        : `${duplicateImportedFingerprints[0]?.count ?? 0} fingerprint(s) duplicado(s) en statements importados`,
      value: Number(duplicateImportedFingerprints[0]?.count ?? 0)
    })
  } catch {
    checks.push({
      name: 'statement_import_missing_fingerprint',
      category: 'document_pipeline',
      scope: 'global',
      status: 'error',
      detail: 'No se pudo verificar fingerprints de import'
    })
    checks.push({
      name: 'statement_import_duplicate_fingerprint',
      category: 'document_pipeline',
      scope: 'global',
      status: 'error',
      detail: 'No se pudo verificar duplicados de import'
    })
  }

  // 9. Overdue receivables
  try {
    const spaceScope = buildSpaceCondition({ alias: 'i', startIndex: 1, spaceId: tenantSpaceId })

    const overdue = await runGreenhousePostgresQuery<{ count: string; total_clp: string } & Record<string, unknown>>(
      `SELECT COUNT(*)::text AS count, COALESCE(SUM(total_amount_clp - COALESCE(amount_paid, 0)), 0)::text AS total_clp
       FROM greenhouse_finance.income i
       WHERE payment_status IN ('pending', 'partial', 'overdue')
         AND due_date < CURRENT_DATE${spaceScope.clause}`,
      spaceScope.params
    )

    const count = Number(overdue[0]?.count ?? 0)

    checks.push({
      name: 'overdue_receivables',
      category: 'receivables_risk',
      scope: tenantSpaceId ? 'tenant' : 'global',
      status: count === 0 ? 'ok' : count > 5 ? 'error' : 'warning',
      detail: count === 0
        ? 'Sin facturas vencidas'
        : `${count} factura(s) vencida(s)`,
      value: count
    })
  } catch {
    checks.push({
      name: 'overdue_receivables',
      category: 'receivables_risk',
      scope: tenantSpaceId ? 'tenant' : 'global',
      status: 'error',
      detail: 'No se pudo verificar cuentas por cobrar vencidas'
    })
  }

  const summaryBuckets = buildSummaryBuckets(checks)
  const warningCount = summaryBuckets.filter(bucket => bucket.status === 'warning').length
  const errorCount = summaryBuckets.filter(bucket => bucket.status === 'error').length
  const issueCount = warningCount + errorCount
  const hasError = checks.some(c => c.status === 'error')
  const hasWarning = checks.some(c => c.status === 'warning')
  const overallStatus = hasError ? 'error' : hasWarning ? 'warning' : 'ok'

  return NextResponse.json({
    checks,
    summary: {
      issueCount,
      warningCount,
      errorCount,
      scope: tenantSpaceId ? 'tenant' : 'global',
      headline: summarizeFinanceBuckets(summaryBuckets),
      buckets: summaryBuckets
    },
    overallStatus,
    checkedAt: new Date().toISOString()
  })
}
