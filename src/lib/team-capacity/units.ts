import type { TeamCapacityHealth } from '@/types/team'

export const DEFAULT_MONTHLY_BASE_HOURS = 160
export const DEFAULT_MAX_FTE = 1

export type CapacityUnitConfig = {
  monthlyBaseHours?: number
  maxFte?: number
}

export type CapacityEnvelope = {
  contractedFte: number
  contractedHours: number
  assignedHours: number
  usedHours: number | null
  commercialAvailabilityHours: number
  operationalAvailabilityHours: number | null
  overassignedCommercially: boolean
  overloadedOperationally: boolean | null
}

export const roundToTenths = (value: number) => Math.round(value * 10) / 10

export const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

export const clampFte = (fte: number, config?: CapacityUnitConfig) => {
  const maxFte = config?.maxFte ?? DEFAULT_MAX_FTE

  return roundToTenths(Math.max(0, Math.min(maxFte, fte)))
}

export const clampHours = (hours: number) => Math.max(0, Math.round(hours))

export const fteToHours = (fte: number, config?: CapacityUnitConfig) => {
  const monthlyBaseHours = config?.monthlyBaseHours ?? DEFAULT_MONTHLY_BASE_HOURS

  return Math.round(Math.max(0, fte) * monthlyBaseHours)
}

export const hoursToFte = (hours: number, config?: CapacityUnitConfig) => {
  const monthlyBaseHours = config?.monthlyBaseHours ?? DEFAULT_MONTHLY_BASE_HOURS

  if (!Number.isFinite(hours) || hours <= 0 || monthlyBaseHours <= 0) {
    return 0
  }

  return roundToTenths(hours / monthlyBaseHours)
}

export const getCommercialAvailabilityHours = ({
  contractedHours,
  assignedHours
}: {
  contractedHours: number
  assignedHours: number
}) => clampHours(contractedHours - assignedHours)

export const getOperationalAvailabilityHours = ({
  contractedHours,
  usedHours
}: {
  contractedHours: number
  usedHours: number | null
}) => (usedHours === null ? null : clampHours(contractedHours - usedHours))

export const buildCapacityEnvelope = ({
  contractedFte,
  assignedHours,
  usedHours = null,
  config
}: {
  contractedFte: number
  assignedHours: number
  usedHours?: number | null
  config?: CapacityUnitConfig
}): CapacityEnvelope => {
  const normalizedFte = clampFte(contractedFte, config)
  const contractedHours = fteToHours(normalizedFte, config)
  const normalizedAssignedHours = clampHours(assignedHours)
  const normalizedUsedHours = usedHours === null ? null : clampHours(usedHours)
  const commercialAvailabilityHours = clampHours(contractedHours - normalizedAssignedHours)
  const operationalAvailabilityHours = normalizedUsedHours === null ? null : clampHours(contractedHours - normalizedUsedHours)

  return {
    contractedFte: normalizedFte,
    contractedHours,
    assignedHours: normalizedAssignedHours,
    usedHours: normalizedUsedHours,
    commercialAvailabilityHours,
    operationalAvailabilityHours,
    overassignedCommercially: normalizedAssignedHours > contractedHours,
    overloadedOperationally: normalizedUsedHours === null ? null : normalizedUsedHours > contractedHours
  }
}

export const getCapacityHealth = (utilizationPercent: number): TeamCapacityHealth => {
  if (utilizationPercent >= 100) {
    return 'overloaded'
  }

  if (utilizationPercent >= 85) {
    return 'high'
  }

  if (utilizationPercent >= 35) {
    return 'balanced'
  }

  return 'idle'
}
