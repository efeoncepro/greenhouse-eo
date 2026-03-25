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

// ── Formal 4-Type Capacity Model ──────────────────────────────

/**
 * Capacity breakdown per member/assignment.
 *
 * - contracted: baseline contractual hours (from contracted_hours_month or fte * 160)
 * - assigned: hours committed via FTE allocation (fte * 160)
 * - used: hours actually utilized (from activeAssets / throughput * assigned)
 * - available: contracted - used (can be negative = overcommitted)
 */
export interface CapacityBreakdown {
  contractedHoursMonth: number
  assignedHoursMonth: number
  usedHoursMonth: number
  availableHoursMonth: number
  overcommitted: boolean
}

export const computeCapacityBreakdown = ({
  fteAllocation,
  contractedHoursMonth,
  utilizationPercent
}: {
  fteAllocation: number
  contractedHoursMonth: number | null
  utilizationPercent: number
}): CapacityBreakdown => {
  const assigned = getAssignedHoursMonth(fteAllocation)
  const contracted = contractedHoursMonth ?? assigned
  const used = Math.round(assigned * (utilizationPercent / 100))
  const available = contracted - used

  return {
    contractedHoursMonth: contracted,
    assignedHoursMonth: assigned,
    usedHoursMonth: used,
    availableHoursMonth: available,
    overcommitted: available < 0
  }
}

/**
 * Aggregate capacity breakdown for a team.
 */
export const aggregateCapacityBreakdown = (breakdowns: CapacityBreakdown[]): CapacityBreakdown => {
  const contracted = breakdowns.reduce((s, b) => s + b.contractedHoursMonth, 0)
  const assigned = breakdowns.reduce((s, b) => s + b.assignedHoursMonth, 0)
  const used = breakdowns.reduce((s, b) => s + b.usedHoursMonth, 0)
  const available = contracted - used

  return {
    contractedHoursMonth: contracted,
    assignedHoursMonth: assigned,
    usedHoursMonth: used,
    availableHoursMonth: available,
    overcommitted: available < 0
  }
}
