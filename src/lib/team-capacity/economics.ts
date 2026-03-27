import type { FinanceCurrency } from '@/lib/finance/shared'

export type FxContext = {
  sourceCurrency: FinanceCurrency
  targetCurrency: FinanceCurrency
  rate: number
  rateDate: string
  provider: string
  strategy: 'period_last_business_day'
}

export type CompensationBreakdown = {
  sourceCurrency: FinanceCurrency
  baseSalarySource: number
  fixedBonusesSource: number
  variableBonusesSource: number
  employerCostsSource: number
}

export type LaborEconomicsSnapshotStatus =
  | 'complete'
  | 'missing_fx'
  | 'missing_compensation'
  | 'invalid_capacity'

export type LaborEconomicsSnapshot = {
  sourceCurrency: FinanceCurrency
  targetCurrency: FinanceCurrency
  totalCompensationSource: number
  totalLaborCostTarget: number | null
  contractedHours: number
  costPerHourTarget: number | null
  fx: FxContext | null
  snapshotStatus: LaborEconomicsSnapshotStatus
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100

export const getTotalCompensationSource = (input: CompensationBreakdown) =>
  roundCurrency(
    input.baseSalarySource +
      input.fixedBonusesSource +
      input.variableBonusesSource +
      input.employerCostsSource
  )

export const convertCompensationToTarget = ({
  compensation,
  targetCurrency,
  fx
}: {
  compensation: CompensationBreakdown
  targetCurrency: FinanceCurrency
  fx?: FxContext | null
}) => {
  const totalCompensationSource = getTotalCompensationSource(compensation)

  if (compensation.sourceCurrency === targetCurrency) {
    return {
      totalCompensationSource,
      totalLaborCostTarget: totalCompensationSource,
      snapshotStatus: 'complete' as LaborEconomicsSnapshotStatus
    }
  }

  if (!fx || !Number.isFinite(fx.rate) || fx.rate <= 0) {
    return {
      totalCompensationSource,
      totalLaborCostTarget: null,
      snapshotStatus: 'missing_fx' as LaborEconomicsSnapshotStatus
    }
  }

  return {
    totalCompensationSource,
    totalLaborCostTarget: roundCurrency(totalCompensationSource * fx.rate),
    snapshotStatus: 'complete' as LaborEconomicsSnapshotStatus
  }
}

export const getCostPerHour = ({
  totalLaborCostTarget,
  contractedHours
}: {
  totalLaborCostTarget: number | null
  contractedHours: number
}) => {
  if (totalLaborCostTarget === null || contractedHours <= 0) {
    return null
  }

  return roundCurrency(totalLaborCostTarget / contractedHours)
}

export const buildLaborEconomicsSnapshot = ({
  compensation,
  contractedHours,
  targetCurrency,
  fx
}: {
  compensation: CompensationBreakdown | null
  contractedHours: number
  targetCurrency: FinanceCurrency
  fx?: FxContext | null
}): LaborEconomicsSnapshot => {
  if (!compensation) {
    return {
      sourceCurrency: targetCurrency,
      targetCurrency,
      totalCompensationSource: 0,
      totalLaborCostTarget: null,
      contractedHours,
      costPerHourTarget: null,
      fx: fx ?? null,
      snapshotStatus: 'missing_compensation'
    }
  }

  if (contractedHours <= 0) {
    return {
      sourceCurrency: compensation.sourceCurrency,
      targetCurrency,
      totalCompensationSource: getTotalCompensationSource(compensation),
      totalLaborCostTarget: null,
      contractedHours,
      costPerHourTarget: null,
      fx: fx ?? null,
      snapshotStatus: 'invalid_capacity'
    }
  }

  const normalizedFx =
    compensation.sourceCurrency === targetCurrency
      ? null
      : fx && fx.sourceCurrency === compensation.sourceCurrency && fx.targetCurrency === targetCurrency
        ? fx
        : null

  const converted = convertCompensationToTarget({ compensation, targetCurrency, fx: normalizedFx })

  return {
    sourceCurrency: compensation.sourceCurrency,
    targetCurrency,
    totalCompensationSource: converted.totalCompensationSource,
    totalLaborCostTarget: converted.totalLaborCostTarget,
    contractedHours,
    costPerHourTarget: getCostPerHour({
      totalLaborCostTarget: converted.totalLaborCostTarget,
      contractedHours
    }),
    fx: normalizedFx,
    snapshotStatus: converted.snapshotStatus
  }
}
