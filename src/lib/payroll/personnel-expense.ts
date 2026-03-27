import 'server-only'

import type { PayRegime, PayrollCurrency } from '@/types/payroll'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { isPayrollPostgresEnabled } from '@/lib/payroll/postgres-store'
import { runPayrollQuery, toNumber } from '@/lib/payroll/shared'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export interface PersonnelExpensePeriod {
  periodId: string
  year: number
  month: number
  headcount: number
  totalsByCurrency: PersonnelExpenseMoneyByCurrency[]
  hasMixedCurrency: boolean
}

export interface PersonnelExpenseByRegime {
  regime: PayRegime
  currency: PayrollCurrency
  headcount: number
  gross: number
  net: number
}

export interface PersonnelExpenseMoneyByCurrency {
  currency: PayrollCurrency
  gross: number
  net: number
  deductions: number
  bonuses: number
}

export interface PersonnelExpenseReport {
  periods: PersonnelExpensePeriod[]
  totals: {
    totalHeadcount: number
    byCurrency: PersonnelExpenseMoneyByCurrency[]
    avgMonthlyByCurrency: Array<{
      currency: PayrollCurrency
      gross: number
      net: number
      deductions: number
      bonuses: number
    }>
  }
  byRegime: PersonnelExpenseByRegime[]
}

type PgExpenseCurrencyRow = {
  period_id: string
  year: number | string
  month: number | string
  currency: string
  headcount: number | string
  total_gross: number | string
  total_net: number | string
  total_deductions: number | string | null
  total_bonuses: number | string
}

type PgRegimeRow = {
  pay_regime: string
  currency: string
  headcount: number | string
  gross: number | string
  net: number | string
}

const getProjectId = () => getBigQueryProjectId()

const normalizePayrollCurrency = (value: string): PayrollCurrency => (value === 'USD' ? 'USD' : 'CLP')

const upsertCurrencyBucket = (
  buckets: PersonnelExpenseMoneyByCurrency[],
  row: {
    currency: string
    gross: number | string
    net: number | string
    deductions: number | string | null
    bonuses: number | string
  }
) => {
  const currency = normalizePayrollCurrency(row.currency)
  const existing = buckets.find(bucket => bucket.currency === currency)

  if (existing) {
    existing.gross += toNumber(row.gross)
    existing.net += toNumber(row.net)
    existing.deductions += toNumber(row.deductions ?? 0)
    existing.bonuses += toNumber(row.bonuses)

    return
  }

  buckets.push({
    currency,
    gross: toNumber(row.gross),
    net: toNumber(row.net),
    deductions: toNumber(row.deductions ?? 0),
    bonuses: toNumber(row.bonuses)
  })
}

export const buildPersonnelExpenseReport = ({
  periodRows,
  regimeRows
}: {
  periodRows: PgExpenseCurrencyRow[]
  regimeRows: PgRegimeRow[]
}): PersonnelExpenseReport => {
  const periodsMap = new Map<string, PersonnelExpensePeriod>()
  const totalBuckets: PersonnelExpenseMoneyByCurrency[] = []

  for (const row of periodRows) {
    const periodId = String(row.period_id)

    const existing = periodsMap.get(periodId) ?? {
      periodId,
      year: toNumber(row.year),
      month: toNumber(row.month),
      headcount: 0,
      totalsByCurrency: [],
      hasMixedCurrency: false
    }

    existing.headcount += toNumber(row.headcount)
    upsertCurrencyBucket(existing.totalsByCurrency, {
      currency: row.currency,
      gross: row.total_gross,
      net: row.total_net,
      deductions: row.total_deductions ?? 0,
      bonuses: row.total_bonuses
    })
    existing.hasMixedCurrency = existing.totalsByCurrency.length > 1
    periodsMap.set(periodId, existing)

    upsertCurrencyBucket(totalBuckets, {
      currency: row.currency,
      gross: row.total_gross,
      net: row.total_net,
      deductions: row.total_deductions ?? 0,
      bonuses: row.total_bonuses
    })
  }

  const periods = Array.from(periodsMap.values()).sort((a, b) => a.periodId.localeCompare(b.periodId))
  const periodCount = periods.length || 1

  const byRegime: PersonnelExpenseByRegime[] = regimeRows.map(row => ({
    regime: row.pay_regime === 'international' ? 'international' : 'chile',
    currency: normalizePayrollCurrency(row.currency),
    headcount: toNumber(row.headcount),
    gross: toNumber(row.gross),
    net: toNumber(row.net)
  }))

  const avgMonthlyByCurrency = totalBuckets.map(bucket => ({
    currency: bucket.currency,
    gross: Math.round(bucket.gross / periodCount),
    net: Math.round(bucket.net / periodCount),
    deductions: Math.round(bucket.deductions / periodCount),
    bonuses: Math.round(bucket.bonuses / periodCount)
  }))

  const maxHeadcount = periods.length > 0 ? Math.max(...periods.map(period => period.headcount)) : 0

  return {
    periods,
    totals: {
      totalHeadcount: maxHeadcount,
      byCurrency: totalBuckets,
      avgMonthlyByCurrency
    },
    byRegime
  }
}

export const getPersonnelExpenseReport = async (
  yearFrom: number,
  monthFrom: number,
  yearTo: number,
  monthTo: number
): Promise<PersonnelExpenseReport> => {
  const periodIdFrom = `${yearFrom}-${String(monthFrom).padStart(2, '0')}`
  const periodIdTo = `${yearTo}-${String(monthTo).padStart(2, '0')}`

  let periodRows: PgExpenseCurrencyRow[]
  let regimeRows: PgRegimeRow[]

  if (isPayrollPostgresEnabled()) {
    ;[periodRows, regimeRows] = await Promise.all([
      runGreenhousePostgresQuery<PgExpenseCurrencyRow>(
        `
          SELECT
            p.period_id,
            p.year,
            p.month,
            e.currency,
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
          GROUP BY p.period_id, p.year, p.month, e.currency
          ORDER BY p.period_id ASC, e.currency ASC
        `,
        [periodIdFrom, periodIdTo]
      ),
      runGreenhousePostgresQuery<PgRegimeRow>(
        `
          SELECT
            e.pay_regime,
            e.currency,
            COUNT(DISTINCT e.member_id) AS headcount,
            COALESCE(SUM(e.gross_total), 0) AS gross,
            COALESCE(SUM(e.net_total), 0) AS net
          FROM greenhouse_payroll.payroll_entries AS e
          INNER JOIN greenhouse_payroll.payroll_periods AS p ON p.period_id = e.period_id
          WHERE p.status IN ('approved', 'exported')
            AND p.period_id >= $1
            AND p.period_id <= $2
          GROUP BY e.pay_regime, e.currency
        `,
        [periodIdFrom, periodIdTo]
      )
    ])
  } else {
    const projectId = getProjectId()

    ;[periodRows, regimeRows] = await Promise.all([
      runPayrollQuery<PgExpenseCurrencyRow>(
        `
          SELECT
            p.period_id,
            p.year,
            p.month,
            e.currency,
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
          GROUP BY p.period_id, p.year, p.month, e.currency
          ORDER BY p.period_id ASC, e.currency ASC
        `,
        { periodIdFrom, periodIdTo }
      ),
      runPayrollQuery<PgRegimeRow>(
        `
          SELECT
            e.pay_regime,
            e.currency,
            COUNT(DISTINCT e.member_id) AS headcount,
            COALESCE(SUM(e.gross_total), 0) AS gross,
            COALESCE(SUM(e.net_total), 0) AS net
          FROM \`${projectId}.greenhouse.payroll_entries\` AS e
          INNER JOIN \`${projectId}.greenhouse.payroll_periods\` AS p ON p.period_id = e.period_id
          WHERE p.status IN ('approved', 'exported')
            AND p.period_id >= @periodIdFrom
            AND p.period_id <= @periodIdTo
          GROUP BY e.pay_regime, e.currency
        `,
        { periodIdFrom, periodIdTo }
      )
    ])
  }

  return buildPersonnelExpenseReport({ periodRows, regimeRows })
}
