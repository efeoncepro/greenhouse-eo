import type { FinanceCurrency } from '@/lib/finance/shared'

import type { DirectMemberOverhead } from './overhead'

const roundCurrency = (value: number) => Math.round(value * 100) / 100

export type SubscriptionLicenseCostInput = {
  toolId: string
  costModel: 'subscription' | 'hybrid'
  subscriptionAmount: number | null
  subscriptionCurrency: FinanceCurrency
  subscriptionBillingCycle: string | null
  subscriptionSeats: number | null
}

export type DirectToolCostSources = {
  memberId: string
  periodYear: number
  periodMonth: number
  targetCurrency: FinanceCurrency
  licenses: SubscriptionLicenseCostInput[]
  toolingCostTarget: number
  equipmentCostTarget?: number
  fxByCurrency?: Partial<Record<FinanceCurrency, number>>
}

export type DirectOverheadBreakdown = {
  licenseCostTarget: number
  toolingCostTarget: number
  equipmentCostTarget: number
}

export type DirectOverheadComputeResult = {
  direct: DirectMemberOverhead
  breakdown: DirectOverheadBreakdown
  snapshotStatus: 'complete' | 'partial' | 'missing_inputs'
}

const toMonthlyFactor = (billingCycle: string | null) => {
  const normalized = String(billingCycle || 'monthly').trim().toLowerCase()

  switch (normalized) {
    case '':
    case 'monthly':
      return 1
    case 'quarterly':
      return 1 / 3
    case 'annual':
    case 'yearly':
      return 1 / 12
    default:
      return null
  }
}

export const computeDirectOverheadForMember = ({
  memberId,
  periodYear,
  periodMonth,
  targetCurrency,
  licenses,
  toolingCostTarget,
  equipmentCostTarget = 0,
  fxByCurrency = {}
}: DirectToolCostSources): DirectOverheadComputeResult => {
  let licenseCostTarget = 0
  let completeLicenses = true

  for (const license of licenses) {
    const monthlyFactor = toMonthlyFactor(license.subscriptionBillingCycle)
    const seatDivisor = license.subscriptionSeats && license.subscriptionSeats > 0 ? license.subscriptionSeats : 1

    if (!license.subscriptionAmount || monthlyFactor == null || seatDivisor <= 0) {
      completeLicenses = false
      continue
    }

    const monthlySourceCost = roundCurrency((license.subscriptionAmount * monthlyFactor) / seatDivisor)

    if (license.subscriptionCurrency === targetCurrency) {
      licenseCostTarget = roundCurrency(licenseCostTarget + monthlySourceCost)
      continue
    }

    const fxRate = fxByCurrency[license.subscriptionCurrency]

    if (!fxRate || fxRate <= 0) {
      completeLicenses = false
      continue
    }

    licenseCostTarget = roundCurrency(licenseCostTarget + monthlySourceCost * fxRate)
  }

  const breakdown: DirectOverheadBreakdown = {
    licenseCostTarget,
    toolingCostTarget: roundCurrency(Math.max(0, toolingCostTarget)),
    equipmentCostTarget: roundCurrency(Math.max(0, equipmentCostTarget))
  }

  const snapshotStatus =
    licenses.length === 0 && breakdown.toolingCostTarget <= 0 && breakdown.equipmentCostTarget <= 0
      ? 'complete'
      : completeLicenses
        ? 'complete'
        : 'partial'

  return {
    direct: {
      memberId,
      periodYear,
      periodMonth,
      sourceCurrency: targetCurrency,
      licenseCostSource: breakdown.licenseCostTarget,
      toolingCostSource: breakdown.toolingCostTarget,
      equipmentCostSource: breakdown.equipmentCostTarget
    },
    breakdown,
    snapshotStatus
  }
}
