import 'server-only'

import type { ContractType, GratificacionLegalMode, HealthSystem } from '@/types/payroll'
import type { ChileDeductionResult } from '@/lib/payroll/calculate-chile-deductions'

import { calculatePayrollTotals } from '@/lib/payroll/calculate-chile-deductions'
import { computeChileTax } from '@/lib/payroll/compute-chile-tax'

/** Maximum iterations for binary search convergence */
const MAX_ITERATIONS = 60

/** Convergence tolerance in CLP */
const TOLERANCE_CLP = 1

export type ReversePayrollInput = {
  desiredNetClp: number
  periodDate: string
  remoteAllowance?: number
  colacionAmount?: number
  movilizacionAmount?: number
  fixedBonusAmount?: number
  gratificacionLegalMode?: GratificacionLegalMode
  afpName?: string | null
  afpRate?: number | null
  afpCotizacionRate?: number | null
  afpComisionRate?: number | null
  healthSystem?: HealthSystem | null
  healthPlanUf?: number | null
  contractType?: ContractType
  hasApv?: boolean
  apvAmount?: number
  unemploymentRate?: number | null
  ufValue?: number | null
  taxTableVersion?: string | null
  utmValue?: number | null
}

export type ReversePayrollResult = {
  converged: boolean
  iterations: number
  baseSalary: number
  netDifferenceCLP: number
  forward: ChileDeductionResult
  taxAmountClp: number
  netTotalWithTax: number
  employerTotalCost: number | null
}

/**
 * Reverse payroll engine: given a desired net amount, find the base salary
 * that produces it through the forward Chile payroll engine.
 *
 * Uses binary search since net is monotonically increasing with base salary.
 * Wraps the real forward engine (calculatePayrollTotals + computeChileTax)
 * — no parallel or duplicated logic.
 *
 * For each candidate baseSalary the engine runs a two-pass forward:
 *   pass 1 → calculatePayrollTotals(taxAmount=0) → get chileTaxableBase
 *   pass 2 → computeChileTax(taxableBase) → get taxAmountClp
 *   net    → pass1.netTotalCalculated − taxAmountClp
 */
export async function computeGrossFromNet(input: ReversePayrollInput): Promise<ReversePayrollResult> {
  const {
    desiredNetClp,
    periodDate,
    remoteAllowance = 0,
    colacionAmount = 0,
    movilizacionAmount = 0,
    fixedBonusAmount = 0,
    gratificacionLegalMode = 'ninguna',
    afpName = null,
    afpRate = null,
    afpCotizacionRate = null,
    afpComisionRate = null,
    healthSystem = 'fonasa',
    healthPlanUf = null,
    contractType = 'indefinido',
    hasApv = false,
    apvAmount = 0,
    unemploymentRate = null,
    ufValue = null,
    taxTableVersion = null,
    utmValue = null
  } = input

  // Shared forward params (everything except baseSalary and taxAmount)
  const forwardParams = {
    payRegime: 'chile' as const,
    remoteAllowance,
    colacionAmount,
    movilizacionAmount,
    fixedBonusAmount,
    bonusOtdAmount: 0,
    bonusRpaAmount: 0,
    bonusOtherAmount: 0,
    gratificacionLegalMode,
    afpName,
    afpRate,
    afpCotizacionRate,
    afpComisionRate,
    healthSystem,
    healthPlanUf,
    unemploymentRate,
    contractType,
    hasApv,
    apvAmount,
    ufValue,
    periodDate
  }

  /** Run two-pass forward for a given baseSalary and return the net with tax */
  const computeNetForSalary = async (baseSalary: number) => {
    // Pass 1: deductions without tax
    const pass1 = await calculatePayrollTotals({
      ...forwardParams,
      baseSalary,
      taxAmount: 0
    })

    // Pass 2: compute tax from taxable base
    let taxAmountClp = 0

    if (taxTableVersion && utmValue && utmValue > 0) {
      const taxResult = await computeChileTax({
        taxableBaseClp: pass1.chileTaxableBase ?? 0,
        taxTableVersion,
        utmValue
      })

      taxAmountClp = taxResult.taxAmountClp
    }

    // Net with tax = net without tax − tax
    const netTotalWithTax = Math.round((pass1.netTotalCalculated - taxAmountClp) * 100) / 100

    return { forward: pass1, taxAmountClp, netTotalWithTax }
  }

  // --- Binary search ---
  let lo = 0
  let hi = Math.max(desiredNetClp * 3, 10_000_000)
  let bestResult: Awaited<ReturnType<typeof computeNetForSalary>> | null = null
  let bestBaseSalary = 0
  let bestDiff = Infinity
  let iterations = 0

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    iterations = i + 1
    const mid = Math.round((lo + hi) / 2)

    if (mid === lo || mid === hi) break // integer precision limit

    const result = await computeNetForSalary(mid)
    const diff = result.netTotalWithTax - desiredNetClp

    if (Math.abs(diff) < Math.abs(bestDiff)) {
      bestDiff = diff
      bestBaseSalary = mid
      bestResult = result
    }

    if (Math.abs(diff) <= TOLERANCE_CLP) break

    if (diff > 0) {
      hi = mid
    } else {
      lo = mid
    }
  }

  // Fallback: if loop didn't execute (shouldn't happen)
  if (!bestResult) {
    bestResult = await computeNetForSalary(bestBaseSalary)
    bestDiff = bestResult.netTotalWithTax - desiredNetClp
  }

  // Final forward pass with tax included → complete ChileDeductionResult
  const finalForward = await calculatePayrollTotals({
    ...forwardParams,
    baseSalary: bestBaseSalary,
    taxAmount: bestResult.taxAmountClp
  })

  return {
    converged: Math.abs(bestDiff) <= TOLERANCE_CLP,
    iterations,
    baseSalary: bestBaseSalary,
    netDifferenceCLP: Math.round(bestDiff),
    forward: finalForward,
    taxAmountClp: bestResult.taxAmountClp,
    netTotalWithTax: bestResult.netTotalWithTax,
    employerTotalCost: finalForward.chileEmployerTotalCost
  }
}
