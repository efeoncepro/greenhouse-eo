import type { FinanceCurrency } from '@/lib/finance/shared'
import type { TeamRoleCategory } from '@/types/team'

const roundCurrency = (value: number) => Math.round(value * 100) / 100

export type PricingPolicy = {
  targetMarginPct?: number
  markupMultiplier?: number
  minimumBillRateTarget?: number | null
}

export type PricingSnapshot = {
  loadedCostPerHourTarget: number | null
  suggestedBillRateTarget: number | null
  targetCurrency: FinanceCurrency
  policyType: 'margin' | 'markup' | 'minimum_floor'
  snapshotStatus: 'complete' | 'missing_cost'
}

export const getBasePricingPolicy = ({
  roleCategory,
  targetCurrency
}: {
  roleCategory: TeamRoleCategory
  targetCurrency: FinanceCurrency
}): PricingPolicy => {
  void roleCategory
  void targetCurrency

  return {
    targetMarginPct: 0.35,
    minimumBillRateTarget: null
  }
}

export const getLoadedCostPerHour = ({
  laborCostPerHourTarget,
  overheadPerHourTarget
}: {
  laborCostPerHourTarget: number | null
  overheadPerHourTarget: number | null
}) => {
  if (laborCostPerHourTarget === null && overheadPerHourTarget === null) {
    return null
  }

  return roundCurrency((laborCostPerHourTarget ?? 0) + (overheadPerHourTarget ?? 0))
}

export const getSuggestedBillRate = ({
  loadedCostPerHourTarget,
  pricingPolicy,
  targetCurrency
}: {
  loadedCostPerHourTarget: number | null
  pricingPolicy: PricingPolicy
  targetCurrency: FinanceCurrency
}): PricingSnapshot => {
  if (loadedCostPerHourTarget === null) {
    return {
      loadedCostPerHourTarget,
      suggestedBillRateTarget: null,
      targetCurrency,
      policyType: 'markup',
      snapshotStatus: 'missing_cost'
    }
  }

  const minimum = pricingPolicy.minimumBillRateTarget ?? null

  if (pricingPolicy.targetMarginPct != null) {
    const margin = pricingPolicy.targetMarginPct
    const base = margin >= 1 ? loadedCostPerHourTarget : loadedCostPerHourTarget / Math.max(0.01, 1 - margin)
    const suggestedBillRateTarget = roundCurrency(minimum != null ? Math.max(base, minimum) : base)

    return {
      loadedCostPerHourTarget,
      suggestedBillRateTarget,
      targetCurrency,
      policyType: minimum != null && suggestedBillRateTarget === minimum ? 'minimum_floor' : 'margin',
      snapshotStatus: 'complete'
    }
  }

  const multiplier = pricingPolicy.markupMultiplier ?? 1
  const base = loadedCostPerHourTarget * multiplier
  const suggestedBillRateTarget = roundCurrency(minimum != null ? Math.max(base, minimum) : base)

  return {
    loadedCostPerHourTarget,
    suggestedBillRateTarget,
    targetCurrency,
    policyType: minimum != null && suggestedBillRateTarget === minimum ? 'minimum_floor' : 'markup',
    snapshotStatus: 'complete'
  }
}
