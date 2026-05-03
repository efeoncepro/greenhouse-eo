import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

export const EXPENSE_DISTRIBUTION_UNRESOLVED_SIGNAL_ID =
  'finance.expense_distribution.unresolved'

export const EXPENSE_DISTRIBUTION_SHARED_POOL_CONTAMINATION_SIGNAL_ID =
  'finance.expense_distribution.shared_pool_contamination'

const UNRESOLVED_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_finance.expenses e
  WHERE COALESCE(e.is_annulled, FALSE) = FALSE
    AND e.created_at > NOW() - INTERVAL '120 days'
    AND NOT EXISTS (
      SELECT 1
      FROM greenhouse_finance.expense_distribution_resolution edr
      WHERE edr.expense_id = e.expense_id
        AND edr.superseded_at IS NULL
        AND edr.resolution_status = 'resolved'
        AND edr.distribution_lane <> 'unallocated'
    )
`

const SHARED_POOL_CONTAMINATION_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_finance.expenses e
  WHERE COALESCE(e.is_annulled, FALSE) = FALSE
    AND e.created_at > NOW() - INTERVAL '120 days'
    AND e.allocated_client_id IS NULL
    AND COALESCE(e.cost_is_direct, FALSE) = FALSE
    AND COALESCE(e.cost_category, 'operational') IN ('operational', 'infrastructure', 'tax_social', 'overhead')
    AND COALESCE(e.economic_category, 'other') IN (
      'labor_cost_external',
      'regulatory_payment',
      'tax',
      'financial_cost',
      'bank_fee_real',
      'financial_settlement'
    )
`

const buildCountSignal = ({
  signalId,
  source,
  label,
  okSummary,
  errorSummary,
  sql,
  doc
}: {
  signalId: string
  source: string
  label: string
  okSummary: string
  errorSummary: (count: number) => string
  sql: string
  doc: string
}): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  return query<{ n: number }>(sql)
    .then(rows => {
      const count = Number(rows[0]?.n ?? 0)

      return {
        signalId,
        moduleKey: 'finance',
        kind: 'drift',
        source,
        label,
        severity: count === 0 ? 'ok' : 'error',
        summary: count === 0 ? okSummary : errorSummary(count),
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value: sql.trim().replace(/\s+/g, ' ')
          },
          {
            kind: 'metric',
            label: 'count',
            value: String(count)
          },
          {
            kind: 'doc',
            label: 'Spec',
            value: doc
          }
        ]
      } satisfies ReliabilitySignal
    })
    .catch(error => {
      captureWithDomain(error, 'finance', {
        tags: { source }
      })

      return {
        signalId,
        moduleKey: 'finance',
        kind: 'drift',
        source,
        label,
        severity: 'unknown',
        summary: 'No fue posible leer el signal de distribución de gastos. Revisa migración TASK-777 y logs.',
        observedAt,
        evidence: [
          {
            kind: 'metric',
            label: 'error',
            value: error instanceof Error ? error.message : String(error)
          }
        ]
      } satisfies ReliabilitySignal
    })
}

export const getExpenseDistributionUnresolvedSignal = (): Promise<ReliabilitySignal> =>
  buildCountSignal({
    signalId: EXPENSE_DISTRIBUTION_UNRESOLVED_SIGNAL_ID,
    source: 'getExpenseDistributionUnresolvedSignal',
    label: 'Expense distribution unresolved',
    okSummary: 'Todos los expenses recientes tienen distribución canónica resuelta.',
    errorSummary: count =>
      `${count} expense${count === 1 ? '' : 's'} reciente${count === 1 ? '' : 's'} sin distribución canónica resuelta.`,
    sql: UNRESOLVED_SQL,
    doc: 'docs/tasks/in-progress/TASK-777-canonical-expense-distribution-and-shared-cost-pools.md'
  })

export const getExpenseDistributionSharedPoolContaminationSignal = (): Promise<ReliabilitySignal> =>
  buildCountSignal({
    signalId: EXPENSE_DISTRIBUTION_SHARED_POOL_CONTAMINATION_SIGNAL_ID,
    source: 'getExpenseDistributionSharedPoolContaminationSignal',
    label: 'Shared pool contamination',
    okSummary: 'El pool legacy no contiene payroll provider, regulatorio ni costos financieros recientes.',
    errorSummary: count =>
      `${count} expense${count === 1 ? '' : 's'} reciente${count === 1 ? '' : 's'} caería${count === 1 ? '' : 'n'} en el pool legacy aunque no corresponde overhead operacional.`,
    sql: SHARED_POOL_CONTAMINATION_SQL,
    doc: 'docs/tasks/in-progress/TASK-777-canonical-expense-distribution-and-shared-cost-pools.md'
  })
