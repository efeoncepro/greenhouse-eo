import 'server-only'

import { query } from '@/lib/db'

type PayrollRateSnapshotRow = {
  period_year: number | string
  period_month: number | string
  afp_avg_rate: number | string | null
  sis_rate: number | string | null
  tope_afp_uf: number | string | null
  tope_cesantia_uf: number | string | null
}

type PayrollAfpRateRow = {
  afp_name: string
  total_rate: number | string | null
  period_year: number | string
  period_month: number | string
}

const toNumber = (value: unknown): number | null => {
  if (value == null) return null

  const parsed = typeof value === "number" ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const normalizeAfpName = (value: string | null | undefined) =>
  String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const buildPeriodDate = (year: number, month: number) => `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-01`

export interface ChilePayrollRateSnapshot {
  periodYear: number
  periodMonth: number
  periodDate: string
  afpAvgRate: number
  sisRate: number
  topeAfpUf: number | null
  topeCesantiaUf: number | null
  source: 'greenhouse_payroll'
}

export const getCurrentChileanPrevisionalRate = async (
  date: string
): Promise<ChilePayrollRateSnapshot | null> => {
  const rows = await query<PayrollRateSnapshotRow>(
    `WITH target_period AS (
       SELECT p.period_year, p.period_month
       FROM greenhouse_payroll.chile_previred_indicators p
       WHERE make_date(p.period_year, p.period_month, 1) <= date_trunc('month', $1::date)
         AND EXISTS (
           SELECT 1
           FROM greenhouse_payroll.chile_afp_rates a
           WHERE a.period_year = p.period_year
             AND a.period_month = p.period_month
             AND a.is_active = TRUE
         )
       ORDER BY p.period_year DESC, p.period_month DESC
       LIMIT 1
     )
     SELECT tp.period_year,
            tp.period_month,
            AVG(a.total_rate)::numeric AS afp_avg_rate,
            MAX(pi.sis_rate)::numeric AS sis_rate,
            MAX(pi.tope_afp_uf)::numeric AS tope_afp_uf,
            MAX(pi.tope_cesantia_uf)::numeric AS tope_cesantia_uf
     FROM target_period tp
     JOIN greenhouse_payroll.chile_previred_indicators pi
       ON pi.period_year = tp.period_year
      AND pi.period_month = tp.period_month
     JOIN greenhouse_payroll.chile_afp_rates a
       ON a.period_year = tp.period_year
      AND a.period_month = tp.period_month
      AND a.is_active = TRUE
     GROUP BY tp.period_year, tp.period_month`,
    [date]
  )

  const row = rows[0]

  if (!row) {
    return null
  }

  const periodYear = Number(row.period_year)
  const periodMonth = Number(row.period_month)

  return {
    periodYear,
    periodMonth,
    periodDate: buildPeriodDate(periodYear, periodMonth),
    afpAvgRate: toNumber(row.afp_avg_rate) ?? 0,
    sisRate: toNumber(row.sis_rate) ?? 0,
    topeAfpUf: toNumber(row.tope_afp_uf),
    topeCesantiaUf: toNumber(row.tope_cesantia_uf),
    source: 'greenhouse_payroll'
  }
}

export const getCurrentAfpRate = async (afpName: string, date: string): Promise<number | null> => {
  const normalizedTarget = normalizeAfpName(afpName)

  if (!normalizedTarget) {
    return null
  }

  const rows = await query<PayrollAfpRateRow>(
    `SELECT afp_name, total_rate, period_year, period_month
     FROM greenhouse_payroll.chile_afp_rates
     WHERE is_active = TRUE
       AND make_date(period_year, period_month, 1) <= date_trunc('month', $1::date)
     ORDER BY period_year DESC, period_month DESC, afp_name ASC`,
    [date]
  )

  if (rows.length === 0) {
    return null
  }

  const latestYear = Number(rows[0].period_year)
  const latestMonth = Number(rows[0].period_month)

  const latestPeriodRows = rows.filter(
    row => Number(row.period_year) === latestYear && Number(row.period_month) === latestMonth
  )

  const exact = latestPeriodRows.find(row => normalizeAfpName(row.afp_name) === normalizedTarget)

  if (exact) {
    return toNumber(exact.total_rate)
  }

  const partial = latestPeriodRows.find(row => {
    const normalizedRow = normalizeAfpName(row.afp_name)

    return normalizedRow.includes(normalizedTarget) || normalizedTarget.includes(normalizedRow)
  })

  return partial ? toNumber(partial.total_rate) : null
}

export const getCurrentUnemploymentRate = async (
  contractType: string,
  date: string
): Promise<number | null> => {
  void date

  if (contractType === 'plazo_fijo') {
    return 0.03
  }

  if (contractType === 'indefinido') {
    return 0.006
  }

  return null
}
