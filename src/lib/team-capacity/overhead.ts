import type { FinanceCurrency } from '@/lib/finance/shared'

import type { FxContext } from './economics'

const roundCurrency = (value: number) => Math.round(value * 100) / 100

export type DirectMemberOverhead = {
  memberId: string
  periodYear: number
  periodMonth: number
  sourceCurrency: FinanceCurrency
  licenseCostSource: number
  toolingCostSource: number
  equipmentCostSource: number
}

export type SharedOverheadPool = {
  periodYear: number
  periodMonth: number
  targetCurrency: FinanceCurrency
  totalSharedOverheadTarget: number
  allocationMethod: 'headcount' | 'fte_weighted' | 'contracted_hours' | 'assigned_hours'
}

export type MemberOverheadSnapshot = {
  directOverheadTarget: number | null
  sharedOverheadTarget: number | null
  totalOverheadTarget: number | null
  overheadPerHourTarget: number | null
  snapshotStatus: 'complete' | 'partial' | 'missing_inputs'
}

export const getDirectOverheadTarget = ({
  direct,
  targetCurrency,
  fx
}: {
  direct: DirectMemberOverhead | null
  targetCurrency: FinanceCurrency
  fx?: FxContext | null
}) => {
  if (!direct) {
    return null
  }

  const totalSource = roundCurrency(
    direct.licenseCostSource + direct.toolingCostSource + direct.equipmentCostSource
  )

  if (direct.sourceCurrency === targetCurrency) {
    return totalSource
  }

  if (!fx || fx.sourceCurrency !== direct.sourceCurrency || fx.targetCurrency !== targetCurrency || fx.rate <= 0) {
    return null
  }

  return roundCurrency(totalSource * fx.rate)
}

export const allocateSharedOverheadTarget = ({
  pool,
  memberWeight,
  totalWeight
}: {
  pool: SharedOverheadPool | null
  memberWeight: number
  totalWeight: number
}) => {
  if (!pool || totalWeight <= 0 || memberWeight <= 0) {
    return null
  }

  return roundCurrency((pool.totalSharedOverheadTarget * memberWeight) / totalWeight)
}

export const buildMemberOverheadSnapshot = ({
  directOverheadTarget,
  sharedOverheadTarget,
  contractedHours
}: {
  directOverheadTarget: number | null
  sharedOverheadTarget: number | null
  contractedHours: number
}): MemberOverheadSnapshot => {
  const hasDirect = directOverheadTarget !== null
  const hasShared = sharedOverheadTarget !== null

  if (!hasDirect && !hasShared) {
    return {
      directOverheadTarget,
      sharedOverheadTarget,
      totalOverheadTarget: null,
      overheadPerHourTarget: null,
      snapshotStatus: 'missing_inputs'
    }
  }

  const totalOverheadTarget = roundCurrency((directOverheadTarget ?? 0) + (sharedOverheadTarget ?? 0))
  const overheadPerHourTarget = contractedHours > 0 ? roundCurrency(totalOverheadTarget / contractedHours) : null

  return {
    directOverheadTarget,
    sharedOverheadTarget,
    totalOverheadTarget,
    overheadPerHourTarget,
    snapshotStatus: hasDirect && hasShared ? 'complete' : 'partial'
  }
}
