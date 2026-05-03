import 'server-only'

import { query } from '@/lib/db'

import { getPaymentObligationsDrift } from './drift-vs-expenses'

export interface PaymentObligationsHealthGrid {
  bridge: {
    lastMaterializedAt: string | null
    lastPeriodId: string | null
    employeeNetPayCount: number
    employerSocialSecurityCount: number
    employeeWithheldCount: number
    providerPayrollCount: number
    activeEntriesCount: number
  }
  drift: Array<{
    periodId: string
    obligationCount: number
    expenseCount: number
    driftCount: number
    label: 'sin_drift' | 'pending_bridge' | 'pending_obligations' | 'count_diff'
    note: string | null
  }>
}

interface BridgeRow extends Record<string, unknown> {
  obligation_kind: string
  n: string
  last: string | null
}

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : 0
  }

  return 0
}

/**
 * Compose para la health grid del header de /finance/payment-orders
 * (Surface ops). Lee:
 *   - Estadisticas del bridge Payroll → Obligations del periodo mas reciente.
 *   - Drift obligations vs expenses para los ultimos N periodos.
 *
 * Read-only sobre las tablas canonicas; no escribe ni reagrega metricas
 * por su cuenta — todo deriva de greenhouse_finance.payment_obligations
 * + greenhouse_finance.expenses + helper drift existente.
 */
export async function getPaymentObligationsHealthGrid(): Promise<PaymentObligationsHealthGrid> {
  const lastPeriodRows = await query<{ period_id: string; last: string | null }>(
    `SELECT period_id, MAX(created_at)::text AS last
       FROM greenhouse_finance.payment_obligations
      WHERE source_kind = 'payroll'
        AND status NOT IN ('cancelled', 'superseded')
      GROUP BY period_id
      ORDER BY MAX(created_at) DESC NULLS LAST
      LIMIT 1`
  )

  const lastPeriodId = lastPeriodRows[0]?.period_id ?? null
  const lastMaterializedAt = lastPeriodRows[0]?.last ?? null

  let employeeNetPayCount = 0
  let employerSocialSecurityCount = 0
  let employeeWithheldCount = 0
  let providerPayrollCount = 0
  let activeEntriesCount = 0

  if (lastPeriodId) {
    const breakdown = await query<BridgeRow>(
      `SELECT obligation_kind, COUNT(*)::text AS n, MAX(created_at)::text AS last
         FROM greenhouse_finance.payment_obligations
        WHERE source_kind = 'payroll'
          AND period_id = $1
          AND status NOT IN ('cancelled', 'superseded')
        GROUP BY obligation_kind`,
      [lastPeriodId]
    )

    breakdown.forEach(row => {
      const n = toNumber(row.n)

      if (row.obligation_kind === 'employee_net_pay') employeeNetPayCount = n
      else if (row.obligation_kind === 'employer_social_security') employerSocialSecurityCount = n
      else if (row.obligation_kind === 'employee_withheld_component') employeeWithheldCount = n
      else if (row.obligation_kind === 'provider_payroll') providerPayrollCount = n
    })

    const entriesRow = await query<{ n: string }>(
      `SELECT COUNT(*)::text AS n
         FROM greenhouse_payroll.payroll_entries
        WHERE period_id = $1
          AND COALESCE(is_active, TRUE) = TRUE`,
      [lastPeriodId]
    )

    activeEntriesCount = toNumber(entriesRow[0]?.n)
  }

  // Drift por periodo (ultimos 4)
  const recentPeriods = await query<{ period_id: string }>(
    `SELECT DISTINCT period_id
       FROM greenhouse_finance.payment_obligations
      WHERE period_id IS NOT NULL
        AND status NOT IN ('cancelled', 'superseded')
      ORDER BY period_id DESC
      LIMIT 4`
  )

  const drift: PaymentObligationsHealthGrid['drift'] = []

  for (const row of recentPeriods) {
    const report = await getPaymentObligationsDrift(row.period_id)

    let label: PaymentObligationsHealthGrid['drift'][number]['label']
    let note: string | null = null

    if (report.driftCount === 0) {
      label = 'sin_drift'
    } else if (report.obligationCount === 0 && report.expenseCount > 0) {
      label = 'pending_obligations'
      note = `${report.expenseCount} expenses sin obligation`
    } else if (report.expenseCount === 0 && report.obligationCount > 0) {
      label = 'pending_bridge'
      note = `${report.obligationCount} obligations sin expense (bridge no corrio)`
    } else {
      label = 'count_diff'
      note = report.notes[0] ?? `${report.obligationCount} obligations vs ${report.expenseCount} expenses`
    }

    drift.push({
      periodId: row.period_id,
      obligationCount: report.obligationCount,
      expenseCount: report.expenseCount,
      driftCount: report.driftCount,
      label,
      note
    })
  }

  return {
    bridge: {
      lastMaterializedAt,
      lastPeriodId,
      employeeNetPayCount,
      employerSocialSecurityCount,
      employeeWithheldCount,
      providerPayrollCount,
      activeEntriesCount
    },
    drift
  }
}
