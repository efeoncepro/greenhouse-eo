import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { toNumber } from '@/lib/finance/shared'

/**
 * Total Company Cost per payroll period.
 *
 * The "company cost" of a collaborator is NOT just their salary.
 * It includes:
 *
 * - gross_total: total haberes (base + bonuses + allowances)
 * - chile_employer_total_cost: employer-side charges (SIS + cesantía + mutual)
 *
 * Company cost = gross_total + chile_employer_total_cost
 *
 * This helper provides a single source of truth for this calculation,
 * so no module has to guess which fields to use.
 */

export interface PeriodCompanyCost {
  year: number
  month: number
  periodStatus: string
  entryCount: number
  totalGrossClp: number
  totalEmployerChargesClp: number
  totalCompanyCostClp: number
}

/**
 * Returns the total company cost for the latest payroll period
 * that has been calculated, approved, or exported.
 */
export const getLatestPeriodCompanyCost = async (): Promise<PeriodCompanyCost | null> => {
  try {
    const rows = await runGreenhousePostgresQuery<{
      p_year: number
      p_month: number
      p_status: string
      entry_count: string | number
      total_gross: string | number
      total_employer: string | number
      total_company: string | number
    } & Record<string, unknown>>(
      `SELECT
         p.year AS p_year,
         p.month AS p_month,
         p.status AS p_status,
         COUNT(*)::text AS entry_count,
         COALESCE(SUM(e.gross_total), 0) AS total_gross,
         COALESCE(SUM(e.chile_employer_total_cost), 0) AS total_employer,
         COALESCE(SUM(e.gross_total), 0) + COALESCE(SUM(e.chile_employer_total_cost), 0) AS total_company
       FROM greenhouse_payroll.payroll_entries e
       INNER JOIN greenhouse_payroll.payroll_periods p ON p.period_id = e.period_id
       WHERE p.status IN ('calculated', 'approved', 'exported')
       GROUP BY p.year, p.month, p.status
       ORDER BY p.year DESC, p.month DESC
       LIMIT 1`
    )

    if (!rows[0]) return null

    const r = rows[0]

    return {
      year: Number(r.p_year),
      month: Number(r.p_month),
      periodStatus: String(r.p_status),
      entryCount: Number(r.entry_count),
      totalGrossClp: Math.round(toNumber(r.total_gross)),
      totalEmployerChargesClp: Math.round(toNumber(r.total_employer)),
      totalCompanyCostClp: Math.round(toNumber(r.total_company))
    }
  } catch {
    return null
  }
}
