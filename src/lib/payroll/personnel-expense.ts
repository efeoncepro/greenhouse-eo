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

export interface PersonnelExpenseCurrencyMeta {
  currency: PayrollCurrency
  periodCount: number
  headcount: number
  monthFrom: number
  monthTo: number
  yearFrom: number
  yearTo: number
}

export interface PersonnelExpenseReport {
  periods: PersonnelExpensePeriod[]
  totals: {
    totalHeadcount: number
    headcountByRegime: Array<{ regime: PayRegime; headcount: number }>
    byCurrency: PersonnelExpenseMoneyByCurrency[]
    currencyMeta: PersonnelExpenseCurrencyMeta[]
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

  // Count periods, headcount, and month range per currency
  const currencyPeriodsMap = new Map<PayrollCurrency, { periodIds: Set<string>; headcounts: Set<string>; months: Array<{ year: number; month: number }> }>()

  for (const row of periodRows) {
    const currency = normalizePayrollCurrency(row.currency)
    const entry = currencyPeriodsMap.get(currency) ?? { periodIds: new Set(), headcounts: new Set(), months: [] }

    entry.periodIds.add(String(row.period_id))
    entry.months.push({ year: toNumber(row.year), month: toNumber(row.month) })
    currencyPeriodsMap.set(currency, entry)
  }

  // Derive distinct headcount per currency from regime rows (more accurate: uses DISTINCT member_id)
  for (const row of regimeRows) {
    const currency = normalizePayrollCurrency(row.currency)
    const entry = currencyPeriodsMap.get(currency)

    if (entry) {
      entry.headcounts.add(`${row.pay_regime}:${toNumber(row.headcount)}`)
    }
  }

  const currencyMeta: PersonnelExpenseCurrencyMeta[] = totalBuckets.map(bucket => {
    const meta = currencyPeriodsMap.get(bucket.currency)
    const periodCount = meta?.periodIds.size ?? 1
    const months = meta?.months ?? []
    const sortedMonths = [...months].sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))
    const first = sortedMonths[0]
    const last = sortedMonths[sortedMonths.length - 1]

    // Sum headcount from regime rows for this currency
    const headcount = regimeRows
      .filter(r => normalizePayrollCurrency(r.currency) === bucket.currency)
      .reduce((sum, r) => sum + toNumber(r.headcount), 0)

    return {
      currency: bucket.currency,
      periodCount,
      headcount,
      monthFrom: first?.month ?? 1,
      monthTo: last?.month ?? 12,
      yearFrom: first?.year ?? 0,
      yearTo: last?.year ?? 0
    }
  })

  const byRegime: PersonnelExpenseByRegime[] = regimeRows.map(row => ({
    regime: row.pay_regime === 'international' ? 'international' : 'chile',
    currency: normalizePayrollCurrency(row.currency),
    headcount: toNumber(row.headcount),
    gross: toNumber(row.gross),
    net: toNumber(row.net)
  }))

  const headcountByRegime = byRegime.reduce<Array<{ regime: PayRegime; headcount: number }>>((acc, r) => {
    const existing = acc.find(a => a.regime === r.regime)

    if (existing) {
      existing.headcount = Math.max(existing.headcount, r.headcount)
    } else {
      acc.push({ regime: r.regime, headcount: r.headcount })
    }

    return acc
  }, [])

  // Averages use per-currency period count
  const avgMonthlyByCurrency = totalBuckets.map(bucket => {
    const periodCount = currencyMeta.find(m => m.currency === bucket.currency)?.periodCount || 1

    return {
      currency: bucket.currency,
      gross: Math.round(bucket.gross / periodCount),
      net: Math.round(bucket.net / periodCount),
      deductions: Math.round(bucket.deductions / periodCount),
      bonuses: Math.round(bucket.bonuses / periodCount)
    }
  })

  const maxHeadcount = periods.length > 0 ? Math.max(...periods.map(period => period.headcount)) : 0

  return {
    periods,
    totals: {
      totalHeadcount: maxHeadcount,
      headcountByRegime,
      byCurrency: totalBuckets,
      currencyMeta,
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
