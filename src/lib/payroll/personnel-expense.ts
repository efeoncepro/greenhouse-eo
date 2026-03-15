import 'server-only'

import type { PayRegime } from '@/types/payroll'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { isPayrollPostgresEnabled } from '@/lib/payroll/postgres-store'
import { runPayrollQuery, toNumber, toNullableNumber } from '@/lib/payroll/shared'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export interface PersonnelExpensePeriod {
  periodId: string
  year: number
  month: number
  headcount: number
  totalGross: number
  totalNet: number
  totalDeductions: number
  totalBonuses: number
}

export interface PersonnelExpenseByRegime {
  regime: PayRegime
  headcount: number
  gross: number
  net: number
}

export interface PersonnelExpenseReport {
  periods: PersonnelExpensePeriod[]
  totals: {
    totalGross: number
    totalNet: number
    totalDeductions: number
    totalBonuses: number
    avgMonthlyGross: number
    avgMonthlyNet: number
    totalHeadcount: number
  }
  byRegime: PersonnelExpenseByRegime[]
}

type PgExpenseRow = {
  period_id: string
  year: number | string
  month: number | string
  headcount: number | string
  total_gross: number | string
  total_net: number | string
  total_deductions: number | string | null
  total_bonuses: number | string
}

type PgRegimeRow = {
  pay_regime: string
  headcount: number | string
  gross: number | string
  net: number | string
}

const getProjectId = () => getBigQueryProjectId()

export const getPersonnelExpenseReport = async (
  yearFrom: number,
  monthFrom: number,
  yearTo: number,
  monthTo: number
): Promise<PersonnelExpenseReport> => {
  const periodIdFrom = `${yearFrom}-${String(monthFrom).padStart(2, '0')}`
  const periodIdTo = `${yearTo}-${String(monthTo).padStart(2, '0')}`

  let periodRows: PgExpenseRow[]
  let regimeRows: PgRegimeRow[]

  if (isPayrollPostgresEnabled()) {
    ;[periodRows, regimeRows] = await Promise.all([
      runGreenhousePostgresQuery<PgExpenseRow>(
        `
          SELECT
            p.period_id,
            p.year,
            p.month,
            COUNT(e.entry_id) AS headcount,
            COALESCE(SUM(e.gross_total), 0) AS total_gross,
            COALESCE(SUM(e.net_total), 0) AS total_net,
            COALESCE(SUM(e.chile_total_deductions), 0) AS total_deductions,
            COALESCE(SUM(e.bonus_otd_amount + e.bonus_rpa_amount + e.bonus_other_amount), 0) AS total_bonuses
          FROM greenhouse_payroll.payroll_periods AS p
          INNER JOIN greenhouse_payroll.payroll_entries AS e ON e.period_id = p.period_id
          WHERE p.status IN ('approved', 'exported')
            AND p.period_id >= $1
            AND p.period_id <= $2
          GROUP BY p.period_id, p.year, p.month
          ORDER BY p.period_id ASC
        `,
        [periodIdFrom, periodIdTo]
      ),
      runGreenhousePostgresQuery<PgRegimeRow>(
        `
          SELECT
            e.pay_regime,
            COUNT(DISTINCT e.member_id) AS headcount,
            COALESCE(SUM(e.gross_total), 0) AS gross,
            COALESCE(SUM(e.net_total), 0) AS net
          FROM greenhouse_payroll.payroll_entries AS e
          INNER JOIN greenhouse_payroll.payroll_periods AS p ON p.period_id = e.period_id
          WHERE p.status IN ('approved', 'exported')
            AND p.period_id >= $1
            AND p.period_id <= $2
          GROUP BY e.pay_regime
        `,
        [periodIdFrom, periodIdTo]
      )
    ])
  } else {
    const projectId = getProjectId()

    ;[periodRows, regimeRows] = await Promise.all([
      runPayrollQuery<PgExpenseRow>(
        `
          SELECT
            p.period_id,
            p.year,
            p.month,
            COUNT(e.entry_id) AS headcount,
            COALESCE(SUM(e.gross_total), 0) AS total_gross,
            COALESCE(SUM(e.net_total), 0) AS total_net,
            COALESCE(SUM(e.chile_total_deductions), 0) AS total_deductions,
            COALESCE(SUM(e.bonus_otd_amount + e.bonus_rpa_amount + e.bonus_other_amount), 0) AS total_bonuses
          FROM \`${projectId}.greenhouse.payroll_periods\` AS p
          INNER JOIN \`${projectId}.greenhouse.payroll_entries\` AS e ON e.period_id = p.period_id
          WHERE p.status IN ('approved', 'exported')
            AND p.period_id >= @periodIdFrom
            AND p.period_id <= @periodIdTo
          GROUP BY p.period_id, p.year, p.month
          ORDER BY p.period_id ASC
        `,
        { periodIdFrom, periodIdTo }
      ),
      runPayrollQuery<PgRegimeRow>(
        `
          SELECT
            e.pay_regime,
            COUNT(DISTINCT e.member_id) AS headcount,
            COALESCE(SUM(e.gross_total), 0) AS gross,
            COALESCE(SUM(e.net_total), 0) AS net
          FROM \`${projectId}.greenhouse.payroll_entries\` AS e
          INNER JOIN \`${projectId}.greenhouse.payroll_periods\` AS p ON p.period_id = e.period_id
          WHERE p.status IN ('approved', 'exported')
            AND p.period_id >= @periodIdFrom
            AND p.period_id <= @periodIdTo
          GROUP BY e.pay_regime
        `,
        { periodIdFrom, periodIdTo }
      )
    ])
  }

  const periods: PersonnelExpensePeriod[] = periodRows.map(row => ({
    periodId: String(row.period_id),
    year: toNumber(row.year),
    month: toNumber(row.month),
    headcount: toNumber(row.headcount),
    totalGross: toNumber(row.total_gross),
    totalNet: toNumber(row.total_net),
    totalDeductions: toNumber(row.total_deductions ?? 0),
    totalBonuses: toNumber(row.total_bonuses)
  }))

  const byRegime: PersonnelExpenseByRegime[] = regimeRows.map(row => ({
    regime: row.pay_regime === 'international' ? 'international' : 'chile' as PayRegime,
    headcount: toNumber(row.headcount),
    gross: toNumber(row.gross),
    net: toNumber(row.net)
  }))

  const totalGross = periods.reduce((s, p) => s + p.totalGross, 0)
  const totalNet = periods.reduce((s, p) => s + p.totalNet, 0)
  const totalDeductions = periods.reduce((s, p) => s + p.totalDeductions, 0)
  const totalBonuses = periods.reduce((s, p) => s + p.totalBonuses, 0)
  const monthCount = periods.length || 1
  const maxHeadcount = periods.length > 0 ? Math.max(...periods.map(p => p.headcount)) : 0

  return {
    periods,
    totals: {
      totalGross,
      totalNet,
      totalDeductions,
      totalBonuses,
      avgMonthlyGross: Math.round(totalGross / monthCount),
      avgMonthlyNet: Math.round(totalNet / monthCount),
      totalHeadcount: maxHeadcount
    },
    byRegime
  }
}
