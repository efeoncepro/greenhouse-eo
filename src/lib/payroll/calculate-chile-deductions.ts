import 'server-only'

import type { ContractType, HealthSystem, PayRegime } from '@/types/payroll'

import { PayrollValidationError } from '@/lib/payroll/shared'

type PayrollTotalsInput = {
  payRegime: PayRegime
  baseSalary: number
  remoteAllowance: number
  bonusOtdAmount: number
  bonusRpaAmount: number
  bonusOtherAmount: number
  afpName?: string | null
  afpRate?: number | null
  healthSystem?: HealthSystem | null
  healthPlanUf?: number | null
  unemploymentRate?: number | null
  contractType?: ContractType
  hasApv?: boolean
  apvAmount?: number
  ufValue?: number | null
  taxAmount?: number | null
}

export type ChileDeductionResult = {
  grossTotal: number
  netTotalCalculated: number
  chileAfpName: string | null
  chileAfpRate: number | null
  chileAfpAmount: number | null
  chileHealthSystem: string | null
  chileHealthAmount: number | null
  chileUnemploymentRate: number | null
  chileUnemploymentAmount: number | null
  chileTaxableBase: number | null
  chileTaxAmount: number | null
  chileApvAmount: number | null
  chileUfValue: number | null
  chileTotalDeductions: number | null
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100

export const calculatePayrollTotals = ({
  payRegime,
  baseSalary,
  remoteAllowance,
  bonusOtdAmount,
  bonusRpaAmount,
  bonusOtherAmount,
  afpName,
  afpRate,
  healthSystem,
  healthPlanUf,
  unemploymentRate,
  contractType = 'indefinido',
  hasApv = false,
  apvAmount = 0,
  ufValue,
  taxAmount
}: PayrollTotalsInput): ChileDeductionResult => {
  const totalVariableBonus = bonusOtdAmount + bonusRpaAmount + bonusOtherAmount
  const grossTotal = roundCurrency(baseSalary + remoteAllowance + totalVariableBonus)

  if (payRegime === 'international') {
    return {
      grossTotal,
      netTotalCalculated: grossTotal,
      chileAfpName: null,
      chileAfpRate: null,
      chileAfpAmount: null,
      chileHealthSystem: null,
      chileHealthAmount: null,
      chileUnemploymentRate: null,
      chileUnemploymentAmount: null,
      chileTaxableBase: null,
      chileTaxAmount: null,
      chileApvAmount: null,
      chileUfValue: null,
      chileTotalDeductions: null
    }
  }

  const imponibleBase = Math.max(0, baseSalary + totalVariableBonus)
  const normalizedAfpRate = typeof afpRate === 'number' && Number.isFinite(afpRate) ? afpRate : 0

  const derivedUnemploymentRate =
    typeof unemploymentRate === 'number' && Number.isFinite(unemploymentRate)
      ? unemploymentRate
      : contractType === 'plazo_fijo'
        ? 0.03
        : 0.006

  const afpAmount = roundCurrency(imponibleBase * normalizedAfpRate)

  let healthAmount = 0

  if (healthSystem === 'isapre') {
    if ((healthPlanUf || 0) > 0 && typeof ufValue !== 'number') {
      throw new PayrollValidationError('UF value is required to calculate Isapre deductions.', 400)
    }

    healthAmount = roundCurrency((healthPlanUf || 0) * (ufValue || 0))
  } else {
    healthAmount = roundCurrency(imponibleBase * 0.07)
  }

  const unemploymentAmount = roundCurrency(imponibleBase * derivedUnemploymentRate)
  const normalizedApvAmount = hasApv ? roundCurrency(apvAmount || 0) : 0
  const normalizedTaxAmount = roundCurrency(taxAmount || 0)
  const taxableBase = roundCurrency(Math.max(0, imponibleBase - afpAmount - healthAmount - unemploymentAmount))
  const totalDeductions = roundCurrency(afpAmount + healthAmount + unemploymentAmount + normalizedTaxAmount + normalizedApvAmount)
  const netTotalCalculated = roundCurrency(imponibleBase + remoteAllowance - totalDeductions)

  return {
    grossTotal,
    netTotalCalculated,
    chileAfpName: afpName || null,
    chileAfpRate: normalizedAfpRate || null,
    chileAfpAmount: afpAmount,
    chileHealthSystem: healthSystem || 'fonasa',
    chileHealthAmount: healthAmount,
    chileUnemploymentRate: derivedUnemploymentRate,
    chileUnemploymentAmount: unemploymentAmount,
    chileTaxableBase: taxableBase,
    chileTaxAmount: normalizedTaxAmount,
    chileApvAmount: normalizedApvAmount || null,
    chileUfValue: healthSystem === 'isapre' ? ufValue || null : null,
    chileTotalDeductions: totalDeductions
  }
}
