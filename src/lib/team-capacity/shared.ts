import type { TeamCapacityHealth, TeamRoleCategory } from '@/types/team'
import {
  buildCapacityEnvelope,
  clampFte,
  clampPercent,
  DEFAULT_MONTHLY_BASE_HOURS,
  fteToHours,
  roundToTenths
} from '@/lib/team-capacity/units'

export const CAPACITY_HOURS_PER_FTE = DEFAULT_MONTHLY_BASE_HOURS

const throughputBenchmarks: Record<TeamRoleCategory, number> = {
  account: 30,
  operations: 30,
  strategy: 16,
  design: 20,
  development: 14,
  media: 24,
  unknown: 18
}

export { roundToTenths, clampPercent, clampFte }

export const getAssignedHoursMonth = (fteAllocation: number) => fteToHours(Math.max(0, fteAllocation))

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

/**
 * Determine capacity health from commercial allocation and operational usage.
 *
 * - `overloaded`: only when commercially over-committed (assigned > contracted)
 * - `high`: 85-100% allocation — full dedication, NOT overload
 * - `balanced`: 35-84%
 * - `idle`: < 35% or no assignments
 */
export const getCapacityHealth = (
  utilizationPercent: number,
  overcommitted?: boolean
): TeamCapacityHealth => {
  if (overcommitted) {
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
  usedHoursMonth: number | null
  availableHoursMonth: number
  commercialAvailabilityHours?: number
  operationalAvailabilityHours?: number | null
  overcommitted: boolean
}

export const computeCapacityBreakdown = ({
  fteAllocation,
  contractedHoursMonth,
  utilizationPercent,
  hasUsageData = true
}: {
  fteAllocation: number
  contractedHoursMonth: number | null
  utilizationPercent: number
  hasUsageData?: boolean
}): CapacityBreakdown => {
  const assigned = getAssignedHoursMonth(fteAllocation)
  const contracted = contractedHoursMonth ?? assigned
  const used = hasUsageData ? Math.round(assigned * (utilizationPercent / 100)) : null

  const envelope = buildCapacityEnvelope({
    contractedFte: contracted / CAPACITY_HOURS_PER_FTE,
    assignedHours: assigned,
    usedHours: used
  })

  return {
    contractedHoursMonth: contracted,
    assignedHoursMonth: assigned,
    usedHoursMonth: used,
    availableHoursMonth: envelope.commercialAvailabilityHours,
    commercialAvailabilityHours: envelope.commercialAvailabilityHours,
    operationalAvailabilityHours: envelope.operationalAvailabilityHours,
    overcommitted: envelope.overassignedCommercially
  }
}

/**
 * Aggregate capacity breakdown for a team.
 */
export const aggregateCapacityBreakdown = (breakdowns: CapacityBreakdown[]): CapacityBreakdown => {
  const contracted = breakdowns.reduce((s, b) => s + b.contractedHoursMonth, 0)
  const assigned = breakdowns.reduce((s, b) => s + b.assignedHoursMonth, 0)
  const usedValues = breakdowns.map(b => b.usedHoursMonth).filter((value): value is number => value !== null)
  const used = usedValues.length > 0 ? usedValues.reduce((s, value) => s + value, 0) : null
  const available = contracted - assigned

  return {
    contractedHoursMonth: contracted,
    assignedHoursMonth: assigned,
    usedHoursMonth: used,
    availableHoursMonth: available,
    commercialAvailabilityHours: available,
    operationalAvailabilityHours: used !== null ? contracted - used : null,
    overcommitted: available < 0
  }
}
