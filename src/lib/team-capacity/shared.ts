import type { TeamCapacityHealth, TeamRoleCategory } from '@/types/team'

export const CAPACITY_HOURS_PER_FTE = 160

const throughputBenchmarks: Record<TeamRoleCategory, number> = {
  account: 30,
  operations: 30,
  strategy: 16,
  design: 20,
  development: 14,
  media: 24,
  unknown: 18
}

export const roundToTenths = (value: number) => Math.round(value * 10) / 10

export const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

export const getAssignedHoursMonth = (fteAllocation: number) => Math.round(Math.max(0, fteAllocation) * CAPACITY_HOURS_PER_FTE)

export const getExpectedMonthlyThroughput = ({
  roleCategory,
  fteAllocation
}: {
  roleCategory: TeamRoleCategory
  fteAllocation: number
}) => roundToTenths(Math.max(0, fteAllocation) * throughputBenchmarks[roleCategory])

export const getUtilizationPercent = ({
  activeAssets,
  expectedMonthlyThroughput
}: {
  activeAssets: number
  expectedMonthlyThroughput: number
}) => {
  if (expectedMonthlyThroughput <= 0) {
    return 0
  }

  return clampPercent((Math.max(0, activeAssets) / expectedMonthlyThroughput) * 100)
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
