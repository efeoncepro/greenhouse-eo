import 'server-only'

import type { BonusProrationConfig, PayrollEntry, PayrollKpiSnapshot, ProjectionMode } from '@/types/payroll'

import { getHistoricalEconomicIndicatorForPeriod } from '@/lib/finance/economic-indicators'
import { DEFAULT_BONUS_PRORATION_CONFIG, normalizeBonusProrationConfig } from '@/lib/payroll/bonus-config'
import { buildPayrollEntry } from '@/lib/payroll/calculate-payroll'
import { countWeekdays, fetchAttendanceForAllMembers } from '@/lib/payroll/fetch-attendance-for-period'
import { fetchKpisForPeriod } from '@/lib/payroll/fetch-kpis-for-period'
import { getApplicableCompensationVersionsForPeriod } from '@/lib/payroll/get-compensation'
import { isPayrollPostgresEnabled, pgGetActiveBonusConfig } from '@/lib/payroll/postgres-store'

// ── Types ──

export type ProjectedPayrollEntry = PayrollEntry & {
  projectionMode: ProjectionMode
  asOfDate: string
  projectedWorkingDays: number
  projectedWorkingDaysTotal: number
}

export type ProjectedPayrollResult = {
  period: { year: number; month: number }
  mode: ProjectionMode
  asOfDate: string
  entries: ProjectedPayrollEntry[]
  totals: {
    grossByCurrency: Record<string, number>
    netByCurrency: Record<string, number>
    memberCount: number
  }
}

// ── Helpers ──

const pad2 = (n: number) => String(n).padStart(2, '0')

const getPeriodStart = (year: number, month: number) => `${year}-${pad2(month)}-01`

const getPeriodEnd = (year: number, month: number) => {
  const end = new Date(Date.UTC(year, month, 0))

  return end.toISOString().slice(0, 10)
}

const getToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())

const getBonusConfig = async (periodEnd: string): Promise<BonusProrationConfig> => {
  if (isPayrollPostgresEnabled()) {
    const config = await pgGetActiveBonusConfig(periodEnd)

    return normalizeBonusProrationConfig(config)
  }

  return DEFAULT_BONUS_PRORATION_CONFIG
}

const roundCurrency = (n: number) => Math.round(n * 100) / 100

// ── Core ──

/**
 * Project payroll for all active members in a period.
 *
 * Reuses the canonical `buildPayrollEntry()` with date-aware inputs:
 * - actual_to_date: attendance truncated to today, KPIs from latest ICO materialization
 * - projected_month_end: full month attendance with approved leaves, same KPIs
 *
 * Does NOT write to any table. Does NOT create payroll_entries.
 */
export const projectPayrollForPeriod = async ({
  year,
  month,
  mode
}: {
  year: number
  month: number
  mode: ProjectionMode
}): Promise<ProjectedPayrollResult> => {
  const periodStart = getPeriodStart(year, month)
  const periodEnd = getPeriodEnd(year, month)
  const today = getToday()
  const asOfDate = mode === 'actual_to_date' ? today : periodEnd
  const periodId = `projected_${year}-${pad2(month)}_${mode}`

  // Cut date for attendance: today for actual, period end for projected
  const attendanceCutDate = mode === 'actual_to_date'
    ? (today < periodEnd ? today : periodEnd)
    : periodEnd

  // 1. Fetch all active compensation versions for the period
  const compensationRows = await getApplicableCompensationVersionsForPeriod(periodStart, periodEnd)
  const compensations = compensationRows.filter(row => row.hasCompensationVersion)

  if (compensations.length === 0) {
    return { period: { year, month }, mode, asOfDate, entries: [], totals: { grossByCurrency: {}, netByCurrency: {}, memberCount: 0 } }
  }

  const memberIds = compensations
    .map(c => (typeof c.memberId === 'string' ? c.memberId.trim() : ''))
    .filter(Boolean)

  // 2. Fetch inputs in parallel
  const [kpiMap, attendanceResult, bonusConfig, ufIndicator] = await Promise.all([
    fetchKpisForPeriod({ memberIds, periodYear: year, periodMonth: month })
      .then(r => r.snapshots)
      .catch(() => new Map<string, PayrollKpiSnapshot>()),
    fetchAttendanceForAllMembers(memberIds, periodStart, attendanceCutDate)
      .catch(() => new Map()),
    getBonusConfig(periodEnd),
    getHistoricalEconomicIndicatorForPeriod({ indicatorCode: 'UF', periodDate: asOfDate }).catch(() => null)
  ])

  const ufValue = ufIndicator?.value ?? null

  // Working days context
  const workingDaysCut = countWeekdays(periodStart, attendanceCutDate)
  const workingDaysTotal = countWeekdays(periodStart, periodEnd)

  // 3. Build projected entry for each member
  const entries: ProjectedPayrollEntry[] = []

  for (const compensation of compensations) {
    const kpi = kpiMap.get(compensation.memberId) ?? null
    const attendance = attendanceResult.get(compensation.memberId) ?? null

    const entry = await buildPayrollEntry({
      periodId,
      periodDate: periodEnd,
        compensation,
        ufValue,
        bonusConfig,
        kpi,
        attendance
      })

    entries.push({
      ...entry,
      projectionMode: mode,
      asOfDate,
      projectedWorkingDays: workingDaysCut,
      projectedWorkingDaysTotal: workingDaysTotal
    })
  }

  // 4. Aggregate totals by currency
  const grossByCurrency: Record<string, number> = {}
  const netByCurrency: Record<string, number> = {}

  for (const entry of entries) {
    const cur = entry.currency

    grossByCurrency[cur] = roundCurrency((grossByCurrency[cur] ?? 0) + entry.grossTotal)
    netByCurrency[cur] = roundCurrency((netByCurrency[cur] ?? 0) + entry.netTotal)
  }

  return {
    period: { year, month },
    mode,
    asOfDate,
    entries,
    totals: {
      grossByCurrency,
      netByCurrency,
      memberCount: entries.length
    }
  }
}

/**
 * Project payroll for a single member.
 */
export const projectPayrollForMember = async ({
  memberId,
  year,
  month,
  mode
}: {
  memberId: string
  year: number
  month: number
  mode: ProjectionMode
}): Promise<ProjectedPayrollEntry | null> => {
  const result = await projectPayrollForPeriod({ year, month, mode })

  return result.entries.find(e => e.memberId === memberId) ?? null
}
