import 'server-only'

import { getHistoricalEconomicIndicatorForPeriod } from '@/lib/finance/economic-indicators'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { isPayrollPostgresEnabled } from '@/lib/payroll/postgres-store'
import { normalizeString, toNumber } from '@/lib/payroll/shared'
import { CHILE_ACCIDENT_INSURANCE_ISL_RATE } from '@/lib/payroll/chile-statutory-rates'

export type ChileAfpSplitRates = {
  cotizacionRate: number
  comisionRate: number
}

export type ChileEmployerCostAmounts = {
  sisAmount: number
  cesantiaAmount: number
  mutualAmount: number
  totalCost: number
}

export const resolveChileAfpSplitRates = ({
  totalRate,
  cotizacionRate,
  comisionRate
}: {
  totalRate: number | null
  cotizacionRate: number | null
  comisionRate: number | null
}): ChileAfpSplitRates | null => {
  const isFiniteRate = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1

  const hasCot = isFiniteRate(cotizacionRate)
  const hasCom = isFiniteRate(comisionRate)
  const hasTotal = isFiniteRate(totalRate)

  if (!hasCot && !hasCom && !hasTotal) {
    return null
  }

  if (hasCot && hasCom) {
    return {
      cotizacionRate,
      comisionRate
    }
  }

  if (hasTotal && hasCot) {
    return {
      cotizacionRate,
      comisionRate: Math.max(0, totalRate - cotizacionRate)
    }
  }

  if (hasTotal && hasCom) {
    return {
      cotizacionRate: Math.max(0, totalRate - comisionRate),
      comisionRate
    }
  }

  if (hasTotal) {
    // Conservative default: 10% mandatory contribution, commission is the remainder.
    const defaultCotizacion = Math.min(0.1, totalRate)

    return {
      cotizacionRate: defaultCotizacion,
      comisionRate: Math.max(0, totalRate - defaultCotizacion)
    }
  }

  // Only one split rate present but no total: treat missing part as 0.
  return {
    cotizacionRate: hasCot ? cotizacionRate : 0,
    comisionRate: hasCom ? comisionRate : 0
  }
}

export const resolveChileHealthSplitAmounts = ({
  payRegime,
  healthSystem,
  imponibleBase,
  totalHealthAmount
}: {
  payRegime: 'chile' | 'intl'
  healthSystem: 'fonasa' | 'isapre' | null | undefined
  imponibleBase: number
  totalHealthAmount: number
}): {
  obligatoriaAmount: number
  voluntariaAmount: number
} | null => {
  if (payRegime !== 'chile' || healthSystem !== 'isapre') {
    return null
  }

  const roundCurrency = (value: number) => Math.round(value * 100) / 100
  const obligatoryCap = roundCurrency(Math.max(0, imponibleBase) * 0.07)
  const obligatoryAmount = roundCurrency(Math.min(Math.max(0, totalHealthAmount), obligatoryCap))

  return {
    obligatoriaAmount: obligatoryAmount,
    voluntariaAmount: roundCurrency(Math.max(0, totalHealthAmount - obligatoryAmount))
  }
}

export const resolveChileEmployerCostAmounts = async ({
  payRegime,
  contractType,
  imponibleBase,
  cesantiaBase,
  periodDate
}: {
  payRegime: 'chile' | 'intl'
  contractType: 'indefinido' | 'plazo_fijo'
  imponibleBase: number
  cesantiaBase?: number
  periodDate: string
}): Promise<ChileEmployerCostAmounts | null> => {
  if (payRegime !== 'chile') {
    return null
  }

  const roundCurrency = (value: number) => Math.round(value * 100) / 100
  const safeBase = Math.max(0, imponibleBase)
  const safeCesantiaBase = Math.max(0, cesantiaBase ?? imponibleBase)
  const sisRate = await getSisRate(periodDate)
  const { employerRate: cesantiaRate } = await getChileUnemploymentRatesForPeriod(periodDate, contractType)
  const mutualRate = CHILE_ACCIDENT_INSURANCE_ISL_RATE

  const sisAmount = roundCurrency(safeBase * sisRate)
  const cesantiaAmount = roundCurrency(safeCesantiaBase * cesantiaRate)
  const mutualAmount = roundCurrency(safeBase * mutualRate)

  return {
    sisAmount,
    cesantiaAmount,
    mutualAmount,
    totalCost: roundCurrency(sisAmount + cesantiaAmount + mutualAmount)
  }
}

export type ChileAfpRateSnapshot = {
  afpName: string
  workerRate: number
  totalRate: number
  periodYear: number
  periodMonth: number
  source: string
}

export type ChileAfpRateSplitSnapshot = {
  afpName: string
  cotizacionRate: number
  comisionRate: number
  totalRate: number
  periodYear: number
  periodMonth: number
  source: string
}

type ChilePreviredIndicatorRow = {
  period_year: number | string
  period_month: number | string
  imm_clp: number | string | null
  sis_rate: number | string | null
  tope_afp_uf: number | string | null
  tope_cesantia_uf: number | string | null
  source: string | null
}

const parseYearMonthFromDateString = (dateString: string) => {
  const year = Number(dateString.slice(0, 4))
  const month = Number(dateString.slice(5, 7))

  return {
    year: Number.isFinite(year) ? year : 0,
    month: Number.isFinite(month) ? month : 0
  }
}

const normalizeAfpNameKey = (name: string) =>
  normalizeString(name)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const getPreviredIndicatorsRowForPeriod = async ({
  year,
  month
}: {
  year: number
  month: number
}): Promise<ChilePreviredIndicatorRow | null> => {
  if (!isPayrollPostgresEnabled()) {
    return null
  }

  const chileRows = await runGreenhousePostgresQuery<ChilePreviredIndicatorRow>(
    `
      SELECT
        period_year,
        period_month,
        imm_clp,
        sis_rate,
        tope_afp_uf,
        tope_cesantia_uf,
        source
      FROM greenhouse_payroll.chile_previred_indicators
      WHERE period_year = $1
        AND period_month = $2
      LIMIT 1
    `,
    [year, month]
  )

  if (chileRows[0]) {
    return chileRows[0]
  }

  return runGreenhousePostgresQuery<ChilePreviredIndicatorRow>(
    `
      SELECT
        EXTRACT(YEAR FROM indicator_date)::integer AS period_year,
        EXTRACT(MONTH FROM indicator_date)::integer AS period_month,
        imm_value AS imm_clp,
        sis_rate,
        afp_top_unf AS tope_afp_uf,
        unemployment_top_unf AS tope_cesantia_uf,
        source
      FROM greenhouse_payroll.previred_period_indicators
      WHERE indicator_date >= make_date($1, $2, 1)
        AND indicator_date < (make_date($1, $2, 1) + INTERVAL '1 month')
      ORDER BY indicator_date DESC
      LIMIT 1
    `,
    [year, month]
  )
    .then(rows => rows[0] ?? null)
    .catch(() => null)
}

/**
 * Ingreso Minimo Mensual (Chile) for a period.
 *
 * Canonical path: `greenhouse_finance.economic_indicators` as code `IMM`.
 * Safe fallback: returns null when unavailable.
 */
export const getImmForPeriod = async (periodDate: string) => {
  const { year, month } = parseYearMonthFromDateString(periodDate)

  if (isPayrollPostgresEnabled() && year && month) {
    const rows = await runGreenhousePostgresQuery<{
      imm_clp: number | string | null
    }>(
      `
        SELECT imm_clp
        FROM greenhouse_payroll.chile_previred_indicators
        WHERE period_year = $1
          AND period_month = $2
        LIMIT 1
      `,
      [year, month]
    ).catch(() => [])

    const imm = rows[0]?.imm_clp != null ? toNumber(rows[0].imm_clp) : 0

    if (Number.isFinite(imm) && imm > 0) {
      return imm
    }
  }

  const snapshot = await getHistoricalEconomicIndicatorForPeriod({
    indicatorCode: 'IMM',
    periodDate
  }).catch(() => null)

  return snapshot?.value ?? null
}

/**
 * SIS employer rate for a period (Chile).
 *
 * Safe fallback: returns 0 when the foundation table doesn't exist or has no data.
 */
export const getSisRate = async (periodDate: string) => {
  const { year, month } = parseYearMonthFromDateString(periodDate)
  const row = year && month ? await getPreviredIndicatorsRowForPeriod({ year, month }) : null

  const rate = row?.sis_rate != null ? toNumber(row.sis_rate) : 0

  return Number.isFinite(rate) && rate >= 0 ? rate : 0
}

/**
 * AFP imponible cap (tope) in UF for a period.
 *
 * Safe fallback: returns 0 when unavailable.
 */
export const getTopeAfpForPeriod = async (periodDate: string) => {
  const { year, month } = parseYearMonthFromDateString(periodDate)
  const row = year && month ? await getPreviredIndicatorsRowForPeriod({ year, month }) : null

  const value = row?.tope_afp_uf != null ? toNumber(row.tope_afp_uf) : 0

  return Number.isFinite(value) && value >= 0 ? value : 0
}

/**
 * Cesantia imponible cap (tope) in UF for a period.
 *
 * Safe fallback: returns 0 when unavailable.
 */
export const getTopeCesantiaForPeriod = async (periodDate: string) => {
  const { year, month } = parseYearMonthFromDateString(periodDate)
  const row = year && month ? await getPreviredIndicatorsRowForPeriod({ year, month }) : null

  const value = row?.tope_cesantia_uf != null ? toNumber(row.tope_cesantia_uf) : 0

  return Number.isFinite(value) && value >= 0 ? value : 0
}

export const getChileAfpRatesForPeriod = async ({
  year,
  month
}: {
  year: number
  month: number
}): Promise<ChileAfpRateSnapshot[]> => {
  if (!isPayrollPostgresEnabled()) {
    return []
  }

  // This helper must be safe in environments where the new foundation tables
  // haven't been migrated yet. In that case, we return [] and Payroll falls back
  // to the compensation-provided rate.
  const chileRows = await runGreenhousePostgresQuery<{
    afp_name: string
    total_rate: number | string
    source: string | null
    period_year: number | string
    period_month: number | string
  }>(
    `
      SELECT
        afp_name,
        total_rate,
        source,
        period_year,
        period_month
      FROM greenhouse_payroll.chile_afp_rates
      WHERE period_year = $1
        AND period_month = $2
        AND is_active = TRUE
      ORDER BY afp_name ASC
    `,
    [year, month]
  )

  if (chileRows.length > 0) {
    return chileRows
      .filter(r => normalizeString(r.afp_name))
      .map(r => ({
        afpName: normalizeString(r.afp_name),
        workerRate: toNumber(r.total_rate),
        totalRate: toNumber(r.total_rate),
        source: normalizeString(r.source) || 'manual',
        periodYear: Number(r.period_year),
        periodMonth: Number(r.period_month)
      }))
      .filter(r => Number.isFinite(r.totalRate) && r.totalRate >= 0 && r.totalRate <= 1)
  }

  return runGreenhousePostgresQuery<{
    afp_name: string
    worker_rate: number | string
    total_rate: number | string
    source: string | null
    period_year: number | string
    period_month: number | string
  }>(
    `
      SELECT
        afp_name,
        worker_rate,
        total_rate,
        source,
        EXTRACT(YEAR FROM indicator_date)::integer AS period_year,
        EXTRACT(MONTH FROM indicator_date)::integer AS period_month
      FROM greenhouse_payroll.previred_afp_rates
      WHERE indicator_date >= make_date($1, $2, 1)
        AND indicator_date < (make_date($1, $2, 1) + INTERVAL '1 month')
      ORDER BY indicator_date DESC, afp_name ASC
    `,
    [year, month]
  )
    .then(rows =>
      rows
        .filter(r => normalizeString(r.afp_name))
        .map(r => ({
          afpName: normalizeString(r.afp_name),
          workerRate: toNumber(r.worker_rate),
          totalRate: toNumber(r.total_rate),
          source: normalizeString(r.source) || 'manual',
          periodYear: Number(r.period_year),
          periodMonth: Number(r.period_month)
        }))
        .filter(r => Number.isFinite(r.totalRate) && r.totalRate >= 0 && r.totalRate <= 1)
    )
    .catch(() => [])
}

/**
 * Canonical Chile AFP rate lookup for a period.
 *
 * In the current model we only have `afpName` (not a strict AFP code), so this function
 * accepts a "code" string but resolves by normalized name matching.
 *
 * Safe fallback behavior:
 * - If the foundation tables don't exist or have no data: returns 0.
 */
export const getAfpRateForCode = async (afpCode: string, periodDate: string) => {
  const normalized = normalizeString(afpCode)

  if (!normalized) {
    return 0
  }

  const { year, month } = parseYearMonthFromDateString(periodDate)

  if (!year || !month) {
    return 0
  }

  const resolved = await resolveChileAfpRateForCompensation({
    year,
    month,
    afpName: normalized,
    afpRate: null
  })

  return typeof resolved === 'number' && Number.isFinite(resolved) ? resolved : 0
}

/**
 * Chile unemployment insurance employee rate.
 *
 * Today this is stable and derived from contract type:
 * - indefinido: 0.6%
 * - plazo fijo: 3%
 *
 * The `periodDate` param is kept for forward-compatibility if the rate ever becomes periodized.
 */
export const getUnemploymentRateForPeriod = async (
  _periodDate: string,
  contractType: 'indefinido' | 'plazo_fijo'
) => (contractType === 'plazo_fijo' ? 0 : 0.006)

export const getChileUnemploymentRatesForPeriod = async (
  periodDate: string,
  contractType: 'indefinido' | 'plazo_fijo'
) => {
  const workerRate = await getUnemploymentRateForPeriod(periodDate, contractType)
  const employerRate = contractType === 'plazo_fijo' ? 0.03 : 0.024

  return { workerRate, employerRate }
}

export const resolveChileAfpRateForCompensation = async ({
  year,
  month,
  afpName,
  afpRate
}: {
  year: number
  month: number
  afpName: string | null
  afpRate: number | null
}) => {
  if (typeof afpRate === 'number' && Number.isFinite(afpRate) && afpRate > 0) {
    return afpRate
  }

  const name = normalizeString(afpName)

  if (!name) {
    return null
  }

  const rates = await getChileAfpRatesForPeriod({ year, month })

  if (rates.length === 0) {
    return null
  }

  const desiredKey = normalizeAfpNameKey(name)

  // Prefer exact normalized match.
  const exact = rates.find(r => normalizeAfpNameKey(r.afpName) === desiredKey)

  if (exact) {
    return exact.totalRate
  }

  // Fallback to substring match for minor naming variations.
  const partial = rates.find(r => normalizeAfpNameKey(r.afpName).includes(desiredKey) || desiredKey.includes(normalizeAfpNameKey(r.afpName)))

  return partial?.totalRate ?? null
}

export const resolveChileAfpRateSplitForCompensation = async ({
  year,
  month,
  afpName,
  afpRate
}: {
  year: number
  month: number
  afpName: string | null
  afpRate: number | null
}): Promise<ChileAfpRateSplitSnapshot | null> => {
  const normalizedName = normalizeString(afpName)
  const rates = normalizedName ? await getChileAfpRatesForPeriod({ year, month }) : []

  const desiredKey = normalizeAfpNameKey(normalizedName)
  const exact = rates.find(r => normalizeAfpNameKey(r.afpName) === desiredKey)

  const partial =
    exact ??
    rates.find(
      r =>
        normalizeAfpNameKey(r.afpName).includes(desiredKey) ||
        desiredKey.includes(normalizeAfpNameKey(r.afpName))
    )

  const totalRate =
    partial?.totalRate ??
    (typeof afpRate === 'number' && Number.isFinite(afpRate) && afpRate > 0 ? afpRate : null)

  if (totalRate === null) {
    return null
  }

  const cotizacionRate = partial?.workerRate ?? totalRate

  return {
    afpName: partial?.afpName ?? normalizedName,
    cotizacionRate,
    comisionRate: Math.max(0, totalRate - cotizacionRate),
    totalRate,
    periodYear: year,
    periodMonth: month,
    source: partial?.source || 'manual'
  }
}
