import 'server-only'

import type { ContractType, GratificacionLegalMode, HealthSystem, PayRegime } from '@/types/payroll'

import {
  getAfpRateForCode,
  getImmForPeriod,
  getUnemploymentRateForPeriod,
  getTopeAfpForPeriod,
  getTopeCesantiaForPeriod,
  resolveChileEmployerCostAmounts,
  resolveChileHealthSplitAmounts,
  resolveChileAfpRateSplitForCompensation,
  resolveChileAfpSplitRates
} from '@/lib/payroll/chile-previsional-helpers'
import { PayrollValidationError } from '@/lib/payroll/shared'

type PayrollTotalsInput = {
  payRegime: PayRegime
  baseSalary: number
  remoteAllowance: number
  colacionAmount?: number
  movilizacionAmount?: number
  fixedBonusAmount: number
  bonusOtdAmount: number
  bonusRpaAmount: number
  bonusOtherAmount: number
  gratificacionLegalMode?: GratificacionLegalMode
  afpName?: string | null
  afpRate?: number | null
  afpCotizacionRate?: number | null
  afpComisionRate?: number | null
  healthSystem?: HealthSystem | null
  healthPlanUf?: number | null
  unemploymentRate?: number | null
  contractType?: ContractType
  hasApv?: boolean
  apvAmount?: number
  ufValue?: number | null
  taxAmount?: number | null
  periodDate?: string | null
}

export type ChileDeductionResult = {
  grossTotal: number
  netTotalCalculated: number
  chileAfpName: string | null
  chileAfpRate: number | null
  chileAfpAmount: number | null
  chileAfpCotizacionAmount: number | null
  chileAfpComisionAmount: number | null
  chileGratificacionLegalAmount: number | null
  chileColacionAmount: number | null
  chileMovilizacionAmount: number | null
  chileHealthSystem: string | null
  chileHealthAmount: number | null
  chileHealthObligatoriaAmount: number | null
  chileHealthVoluntariaAmount: number | null
  chileEmployerSisAmount: number | null
  chileEmployerCesantiaAmount: number | null
  chileEmployerMutualAmount: number | null
  chileEmployerTotalCost: number | null
  chileUnemploymentRate: number | null
  chileUnemploymentAmount: number | null
  chileTaxableBase: number | null
  chileTaxAmount: number | null
  chileApvAmount: number | null
  chileUfValue: number | null
  chileTotalDeductions: number | null
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100

export const calculatePayrollTotals = async ({
  payRegime,
  baseSalary,
  remoteAllowance,
  colacionAmount = 0,
  movilizacionAmount = 0,
  fixedBonusAmount,
  bonusOtdAmount,
  bonusRpaAmount,
  bonusOtherAmount,
  gratificacionLegalMode = 'ninguna',
  afpName,
  afpRate,
  afpCotizacionRate,
  afpComisionRate,
  healthSystem,
  healthPlanUf,
  unemploymentRate,
  contractType = 'indefinido',
  hasApv = false,
  apvAmount = 0,
  ufValue,
  taxAmount,
  periodDate
}: PayrollTotalsInput): Promise<ChileDeductionResult> => {
  const fallbackPeriodDate = periodDate || new Date().toISOString().slice(0, 10)
  const shouldApplyGratification = payRegime === 'chile' && gratificacionLegalMode !== 'ninguna'

  const immValue = shouldApplyGratification
    ? await getImmForPeriod(fallbackPeriodDate)
    : null

  const gratificationLegalAmount = (() => {
    if (!shouldApplyGratification) {
      return 0
    }

    if (typeof immValue !== 'number' || !Number.isFinite(immValue) || immValue <= 0) {
      throw new PayrollValidationError('IMM value is required to calculate legal gratification.', 400)
    }

    if (gratificacionLegalMode === 'mensual_25pct' || gratificacionLegalMode === 'anual_proporcional') {
      return roundCurrency(Math.min(baseSalary * 0.25, (immValue * 4.75) / 12))
    }

    return 0
  })()

  const totalVariableBonus = bonusOtdAmount + bonusRpaAmount + bonusOtherAmount

  const grossTotal = roundCurrency(
    baseSalary +
      remoteAllowance +
      colacionAmount +
      movilizacionAmount +
      fixedBonusAmount +
      totalVariableBonus +
      gratificationLegalAmount
  )

  if (payRegime === 'international') {
    return {
      grossTotal,
      netTotalCalculated: grossTotal,
      chileAfpName: null,
      chileAfpRate: null,
      chileAfpAmount: null,
      chileAfpCotizacionAmount: null,
      chileAfpComisionAmount: null,
      chileGratificacionLegalAmount: null,
      chileColacionAmount: null,
      chileMovilizacionAmount: null,
      chileHealthSystem: null,
      chileHealthAmount: null,
      chileHealthObligatoriaAmount: null,
      chileHealthVoluntariaAmount: null,
      chileEmployerSisAmount: null,
      chileEmployerCesantiaAmount: null,
      chileEmployerMutualAmount: null,
      chileEmployerTotalCost: null,
      chileUnemploymentRate: null,
      chileUnemploymentAmount: null,
      chileTaxableBase: null,
      chileTaxAmount: null,
      chileApvAmount: null,
      chileUfValue: null,
      chileTotalDeductions: null
    }
  }

  if (contractType !== 'indefinido' && contractType !== 'plazo_fijo') {
    throw new PayrollValidationError('Chile dependent payroll totals require an indefinido or plazo_fijo contract.', 400, {
      contractType
    })
  }

  const imponibleBase = Math.max(0, baseSalary + fixedBonusAmount + totalVariableBonus + gratificationLegalAmount)
  const topeAfpUf = await getTopeAfpForPeriod(fallbackPeriodDate)
  const topeCesantiaUf = await getTopeCesantiaForPeriod(fallbackPeriodDate)

  const resolveCappedBase = (topeUf: number) => {
    if (topeUf <= 0) {
      return imponibleBase
    }

    if (typeof ufValue !== 'number' || !Number.isFinite(ufValue) || ufValue <= 0) {
      throw new PayrollValidationError('UF value is required to apply Chile statutory imponible caps.', 400)
    }

    return Math.min(imponibleBase, roundCurrency(topeUf * ufValue))
  }

  const pensionHealthAccidentBase = resolveCappedBase(topeAfpUf)
  const cesantiaBase = resolveCappedBase(topeCesantiaUf)

  const normalizedAfpRate =
    typeof afpRate === 'number' && Number.isFinite(afpRate)
      ? afpRate
      : await getAfpRateForCode(afpName || '', fallbackPeriodDate)

  const fallbackYear = Number(fallbackPeriodDate.slice(0, 4))
  const fallbackMonth = Number(fallbackPeriodDate.slice(5, 7))

  const resolvedAfpSplit =
    Number.isFinite(fallbackYear) && Number.isFinite(fallbackMonth)
      ? await resolveChileAfpRateSplitForCompensation({
          year: fallbackYear,
          month: fallbackMonth,
          afpName: afpName || null,
          afpRate: normalizedAfpRate
        })
      : null

  const hasExplicitSplit =
    (typeof afpCotizacionRate === 'number' && Number.isFinite(afpCotizacionRate)) ||
    (typeof afpComisionRate === 'number' && Number.isFinite(afpComisionRate))

  // Prefer explicit split stored on compensation. Otherwise, fall back to the
  // synced Previred foundation (worker_rate vs total_rate), and finally to a
  // conservative 10% cotizacion + remainder commission split.
  const resolvedSplitRates =
    resolveChileAfpSplitRates({
      totalRate: normalizedAfpRate,
      cotizacionRate: hasExplicitSplit ? (afpCotizacionRate ?? null) : resolvedAfpSplit?.cotizacionRate ?? null,
      comisionRate: hasExplicitSplit ? (afpComisionRate ?? null) : resolvedAfpSplit?.comisionRate ?? null
    }) ?? { cotizacionRate: 0, comisionRate: 0 }

  const totalAfpRate = hasExplicitSplit
    ? resolvedSplitRates.cotizacionRate + resolvedSplitRates.comisionRate
    : normalizedAfpRate

  const chileContractType = contractType

  const derivedUnemploymentRate =
    typeof unemploymentRate === 'number' && Number.isFinite(unemploymentRate)
      ? unemploymentRate
      : await getUnemploymentRateForPeriod(fallbackPeriodDate, chileContractType)

  const afpCotizacionAmount = roundCurrency(pensionHealthAccidentBase * resolvedSplitRates.cotizacionRate)
  const afpComisionAmount = roundCurrency(pensionHealthAccidentBase * resolvedSplitRates.comisionRate)
  const afpAmount = roundCurrency(afpCotizacionAmount + afpComisionAmount)

  let healthAmount = 0

  if (healthSystem === 'isapre') {
    if ((healthPlanUf || 0) > 0 && typeof ufValue !== 'number') {
      throw new PayrollValidationError('UF value is required to calculate Isapre deductions.', 400)
    }

    healthAmount = roundCurrency((healthPlanUf || 0) * (ufValue || 0))
  } else {
    healthAmount = roundCurrency(pensionHealthAccidentBase * 0.07)
  }

  const healthSplit = resolveChileHealthSplitAmounts({
    payRegime,
    healthSystem,
    imponibleBase: pensionHealthAccidentBase,
    totalHealthAmount: healthAmount
  })

  const employerCosts = await resolveChileEmployerCostAmounts({
    payRegime,
    contractType: chileContractType,
    imponibleBase: pensionHealthAccidentBase,
    cesantiaBase,
    periodDate: fallbackPeriodDate
  })

  const unemploymentAmount = roundCurrency(cesantiaBase * derivedUnemploymentRate)
  const normalizedApvAmount = hasApv ? roundCurrency(apvAmount || 0) : 0
  const normalizedTaxAmount = roundCurrency(taxAmount || 0)
  const taxableBase = roundCurrency(Math.max(0, imponibleBase - afpAmount - healthAmount - unemploymentAmount))
  const totalDeductions = roundCurrency(afpAmount + healthAmount + unemploymentAmount + normalizedTaxAmount + normalizedApvAmount)

  const netTotalCalculated = roundCurrency(
    imponibleBase + remoteAllowance + colacionAmount + movilizacionAmount - totalDeductions
  )

  return {
    grossTotal,
    netTotalCalculated,
    chileAfpName: afpName || null,
    chileAfpRate: totalAfpRate || null,
    chileAfpAmount: afpAmount,
    chileAfpCotizacionAmount: afpCotizacionAmount,
    chileAfpComisionAmount: afpComisionAmount,
    chileGratificacionLegalAmount: gratificationLegalAmount > 0 ? gratificationLegalAmount : null,
    chileColacionAmount: colacionAmount > 0 ? colacionAmount : null,
    chileMovilizacionAmount: movilizacionAmount > 0 ? movilizacionAmount : null,
    chileHealthSystem: healthSystem || 'fonasa',
    chileHealthAmount: healthAmount,
    chileHealthObligatoriaAmount: healthSplit?.obligatoriaAmount ?? null,
    chileHealthVoluntariaAmount: healthSplit?.voluntariaAmount ?? null,
    chileEmployerSisAmount: employerCosts?.sisAmount ?? null,
    chileEmployerCesantiaAmount: employerCosts?.cesantiaAmount ?? null,
    chileEmployerMutualAmount: employerCosts?.mutualAmount ?? null,
    chileEmployerTotalCost: employerCosts?.totalCost ?? null,
    chileUnemploymentRate: derivedUnemploymentRate,
    chileUnemploymentAmount: unemploymentAmount,
    chileTaxableBase: taxableBase,
    chileTaxAmount: normalizedTaxAmount,
    chileApvAmount: normalizedApvAmount || null,
    chileUfValue: healthSystem === 'isapre' ? ufValue || null : null,
    chileTotalDeductions: totalDeductions
  }
}
