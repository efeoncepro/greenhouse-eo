import { getExpectedMonthlyThroughput, getUtilizationPercent } from '@/lib/team-capacity/shared'
import type { TeamRoleCategory } from '@/types/team'
import type { DerivedMetrics } from './types'

// ── Input interfaces ──

export interface IcoInput {
  rpaAvg: number | null
  otdPct: number | null
  ftrPct: number | null
  throughputCount: number | null
  activeTasks: number | null
}

export interface CapacityInput {
  totalFte: number
  contractedHoursMonth: number
  roleCategory: TeamRoleCategory
}

export interface CompensationInput {
  monthlyTotalComp: number | null
}

// ── Constants ──

/** RPA normalization ceiling — RPA values above this are capped */
const RPA_CEILING = 5.0

/** Weights for quality index components */
const QUALITY_WEIGHTS = { rpa: 0.4, otd: 0.3, ftr: 0.3 } as const

// ── Pure compute functions ──

/**
 * Normalize RPA to 0-100 scale where lower RPA → higher score.
 * RPA 1.0 → 100, RPA 2.0 → 60, RPA 3.0 → 40, RPA 5.0+ → 0
 */
export const normalizeRpa = (rpaAvg: number | null): number | null => {
  if (rpaAvg == null || rpaAvg <= 0) return null

  const clamped = Math.min(rpaAvg, RPA_CEILING)

  return Math.max(0, Math.round((1 - (clamped - 1) / (RPA_CEILING - 1)) * 100))
}

/**
 * Compute quality index: weighted composite of RPA (normalized), OTD%, FTR%.
 * Returns 0-100 score. Null if insufficient data.
 */
export const computeQualityIndex = (
  rpaAvg: number | null,
  otdPct: number | null,
  ftrPct: number | null
): number | null => {
  const rpaNorm = normalizeRpa(rpaAvg)

  // Need at least RPA + one other metric
  if (rpaNorm == null) return null

  const otd = otdPct ?? 0
  const ftr = ftrPct ?? 0

  const score = rpaNorm * QUALITY_WEIGHTS.rpa + otd * QUALITY_WEIGHTS.otd + ftr * QUALITY_WEIGHTS.ftr

  return Math.round(Math.max(0, Math.min(100, score)))
}

/**
 * Compute dedication index: utilization × (1 - |allocation_variance|).
 * Measures how effectively someone uses their allocated capacity.
 * Returns 0-100 score.
 */
export const computeDedicationIndex = (
  utilizationPct: number | null,
  allocationVarianceAbs: number
): number | null => {
  if (utilizationPct == null) return null

  // Normalize utilization to 0-1 (cap at 100%)
  const utilNorm = Math.min(utilizationPct, 100) / 100

  // Variance penalty: 0 variance = 1.0 multiplier, 1.0 FTE variance = 0.0 multiplier
  const variancePenalty = Math.max(0, 1 - allocationVarianceAbs)

  return Math.round(Math.max(0, Math.min(100, utilNorm * variancePenalty * 100)))
}

/**
 * Compute all 6 derived person metrics from cross-source data.
 * Pure function — no I/O, fully testable.
 */
export const computeDerivedMetrics = (
  ico: IcoInput,
  capacity: CapacityInput,
  compensation: CompensationInput
): DerivedMetrics => {
  // Utilization
  const expectedThroughput = getExpectedMonthlyThroughput({
    roleCategory: capacity.roleCategory,
    fteAllocation: capacity.totalFte
  })

  const utilizationPct = expectedThroughput > 0
    ? getUtilizationPercent({
        activeAssets: ico.activeTasks ?? 0,
        expectedMonthlyThroughput: expectedThroughput
      })
    : null

  // Allocation variance
  const allocationVariance = Math.round((capacity.totalFte - 1.0) * 1000) / 1000

  // Cost metrics
  const monthlyComp = compensation.monthlyTotalComp
  const costPerAsset = monthlyComp != null && ico.throughputCount != null && ico.throughputCount > 0
    ? Math.round(monthlyComp / ico.throughputCount)
    : null

  const costPerHour = monthlyComp != null && capacity.contractedHoursMonth > 0
    ? Math.round(monthlyComp / capacity.contractedHoursMonth)
    : null

  // Quality index
  const qualityIndex = computeQualityIndex(ico.rpaAvg, ico.otdPct, ico.ftrPct)

  // Dedication index
  const dedicationIndex = computeDedicationIndex(utilizationPct, Math.abs(allocationVariance))

  return {
    utilizationPct: utilizationPct != null ? Math.round(utilizationPct * 10) / 10 : null,
    allocationVariance,
    costPerAsset,
    costPerHour,
    qualityIndex,
    dedicationIndex
  }
}
