import 'server-only'

import type {
  BonusProrationConfig,
  PayrollAttendanceDiagnostics,
  PayrollEntry,
  PayrollKpiSnapshot,
  ProjectionMode
} from '@/types/payroll'

import { getHistoricalEconomicIndicatorForPeriod } from '@/lib/finance/economic-indicators'
import { formatISODateKey } from '@/lib/format'
import { captureWithDomain } from '@/lib/observability/capture'
import { DEFAULT_BONUS_PRORATION_CONFIG, normalizeBonusProrationConfig } from '@/lib/payroll/bonus-config'
import { buildPayrollEntry } from '@/lib/payroll/calculate-payroll'
import { requiresPayrollAttendanceSignal, requiresPayrollKpi } from '@/lib/payroll/compensation-requirements'
import {
  type AttendanceResult,
  countWeekdays,
  fetchAttendanceForAllMembers,
  getPayrollAttendanceDiagnostics
} from '@/lib/payroll/fetch-attendance-for-period'
import { fetchKpisForPeriod } from '@/lib/payroll/fetch-kpis-for-period'
import { getApplicableCompensationVersionsForPeriod } from '@/lib/payroll/get-compensation'
import {
  isPayrollParticipationWindowEnabled,
  resolvePayrollParticipationWindowsForMembers,
  type PayrollParticipationWindow
} from '@/lib/payroll/participation-window'
import { isPayrollPostgresEnabled, pgGetActiveBonusConfig } from '@/lib/payroll/postgres-store'

// ── Types ──

export type ProjectedPayrollEntry = PayrollEntry & {
  projectionMode: ProjectionMode
  asOfDate: string
  projectedWorkingDays: number
  projectedWorkingDaysTotal: number
  prorationFactor: number
}

export type ProjectedPayrollResult = {
  period: { year: number; month: number }
  mode: ProjectionMode
  asOfDate: string
  attendanceDiagnostics: PayrollAttendanceDiagnostics
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

const getToday = () => formatISODateKey(new Date())

const getBonusConfig = async (periodEnd: string): Promise<BonusProrationConfig> => {
  if (isPayrollPostgresEnabled()) {
    const config = await pgGetActiveBonusConfig(periodEnd)

    return normalizeBonusProrationConfig(config)
  }

  return DEFAULT_BONUS_PRORATION_CONFIG
}

const roundCurrency = (n: number) => Math.round(n * 100) / 100

/**
 * Scale all monetary fields of a payroll entry by a proration factor.
 * Used for actual_to_date mode to show devengado proportional to elapsed working days.
 * Rates, IDs, KPIs, booleans, and bonus ceilings are NOT scaled.
 */
const prorateEntry = (entry: PayrollEntry, factor: number): PayrollEntry => {
  if (factor >= 1) return entry

  const s = (v: number) => roundCurrency(v * factor)
  const sn = (v: number | null) => (v != null ? roundCurrency(v * factor) : null)

  return {
    ...entry,
    baseSalary: s(entry.baseSalary),
    remoteAllowance: s(entry.remoteAllowance),
    colacionAmount: s(entry.colacionAmount),
    movilizacionAmount: s(entry.movilizacionAmount),
    fixedBonusAmount: s(entry.fixedBonusAmount),
    bonusOtdAmount: s(entry.bonusOtdAmount),
    bonusRpaAmount: s(entry.bonusRpaAmount),
    bonusOtherAmount: s(entry.bonusOtherAmount),
    grossTotal: s(entry.grossTotal),
    netTotal: s(entry.netTotal),
    netTotalCalculated: sn(entry.netTotalCalculated),
    adjustedBaseSalary: sn(entry.adjustedBaseSalary),
    adjustedRemoteAllowance: sn(entry.adjustedRemoteAllowance),
    adjustedColacionAmount: sn(entry.adjustedColacionAmount),
    adjustedMovilizacionAmount: sn(entry.adjustedMovilizacionAmount),
    adjustedFixedBonusAmount: sn(entry.adjustedFixedBonusAmount),
    chileGratificacionLegalAmount: sn(entry.chileGratificacionLegalAmount),
    chileColacionAmount: sn(entry.chileColacionAmount),
    chileMovilizacionAmount: sn(entry.chileMovilizacionAmount),
    chileAfpAmount: sn(entry.chileAfpAmount),
    chileAfpCotizacionAmount: sn(entry.chileAfpCotizacionAmount),
    chileAfpComisionAmount: sn(entry.chileAfpComisionAmount),
    chileHealthAmount: sn(entry.chileHealthAmount),
    chileHealthObligatoriaAmount: sn(entry.chileHealthObligatoriaAmount),
    chileHealthVoluntariaAmount: sn(entry.chileHealthVoluntariaAmount),
    chileUnemploymentAmount: sn(entry.chileUnemploymentAmount),
    chileTaxAmount: sn(entry.chileTaxAmount),
    chileApvAmount: sn(entry.chileApvAmount),
    chileTotalDeductions: sn(entry.chileTotalDeductions),
    chileTaxableBase: sn(entry.chileTaxableBase),
    chileEmployerSisAmount: sn(entry.chileEmployerSisAmount),
    chileEmployerCesantiaAmount: sn(entry.chileEmployerCesantiaAmount),
    chileEmployerMutualAmount: sn(entry.chileEmployerMutualAmount),
    chileEmployerTotalCost: sn(entry.chileEmployerTotalCost),
    siiRetentionAmount: entry.siiRetentionAmount != null ? roundCurrency(entry.siiRetentionAmount * factor) : null
  }
}

/**
 * TASK-893 Slice 3 — defensive resolution of the per-member participation
 * window. Gated by `PAYROLL_PARTICIPATION_WINDOW_ENABLED` (default OFF).
 *
 * Contract:
 *
 * - **Flag OFF** → returns `null`. The for-loop below falls back to the
 *   legacy scalar `actualToDateFactor` applied uniformly to every member.
 *   Output is bit-for-bit identical to pre-TASK-893 behavior.
 *
 * - **Flag ON, happy path** → returns `Map<memberId, PayrollParticipationWindow>`.
 *   The for-loop composes `participationFactor × actualToDateFactor` per member.
 *
 * - **Flag ON, resolver throws** → captures Sentry with domain `payroll` +
 *   returns `null` (degrades to legacy). Projected payroll NEVER crashes
 *   when the participation resolver fails. Operator sees the dashboard
 *   render as before; the regression is detected via Sentry + reliability
 *   signal (Slice 5).
 *
 * This wrapper is the **single defensive boundary** between
 * `projectPayrollForPeriod` and the new TASK-893 primitive. Slice 1-2 give
 * the primitive its own internal degradation contracts (exit_resolver_failed
 * warnings); this wrapper protects the projected payroll path from any
 * unexpected throw at the resolver entry.
 */
const maybeResolveParticipationWindows = async (
  memberIds: ReadonlyArray<string>,
  periodStart: string,
  periodEnd: string
): Promise<Map<string, PayrollParticipationWindow> | null> => {
  if (!isPayrollParticipationWindowEnabled()) return null

  if (memberIds.length === 0) return new Map()

  try {
    return await resolvePayrollParticipationWindowsForMembers(memberIds, periodStart, periodEnd)
  } catch (err) {
    captureWithDomain(err, 'payroll', {
      extra: {
        source: 'project_payroll.participation_window_resolve_failed',
        periodStart,
        periodEnd,
        memberCount: memberIds.length
      }
    })

    return null
  }
}

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
  const attendanceCutDate = mode === 'actual_to_date' ? (today < periodEnd ? today : periodEnd) : periodEnd

  // 1. Fetch all active compensation versions for the period
  const compensationRows = await getApplicableCompensationVersionsForPeriod(periodStart, periodEnd)
  const compensations = compensationRows.filter(row => row.hasCompensationVersion)

  if (compensations.length === 0) {
    return {
      period: { year, month },
      mode,
      asOfDate,
      attendanceDiagnostics: getPayrollAttendanceDiagnostics(),
      entries: [],
      totals: { grossByCurrency: {}, netByCurrency: {}, memberCount: 0 }
    }
  }

  const kpiRequiredMemberIds = compensations.filter(requiresPayrollKpi).map(compensation => compensation.memberId)

  const attendanceRequiredMemberIds = compensations
    .filter(requiresPayrollAttendanceSignal)
    .map(compensation => compensation.memberId)

  // 2. Fetch inputs in parallel
  const [kpiMap, attendanceResult, bonusConfig, ufIndicator] = await Promise.all([
    fetchKpisForPeriod({ memberIds: kpiRequiredMemberIds, periodYear: year, periodMonth: month })
      .then(r => r.snapshots)
      .catch(() => new Map<string, PayrollKpiSnapshot>()),
    fetchAttendanceForAllMembers(attendanceRequiredMemberIds, periodStart, attendanceCutDate).catch(
      (): AttendanceResult => ({ snapshots: new Map(), leaveDataDegraded: true })
    ),
    getBonusConfig(periodEnd),
    getHistoricalEconomicIndicatorForPeriod({ indicatorCode: 'UF', periodDate: asOfDate }).catch(() => null)
  ])

  const attendanceSnapshots = attendanceResult.snapshots

  const attendanceDiagnostics = getPayrollAttendanceDiagnostics({
    leaveDataDegraded: attendanceResult.leaveDataDegraded
  })

  const ufValue = ufIndicator?.value ?? null

  // Working days context
  const workingDaysCut = countWeekdays(periodStart, attendanceCutDate)
  const workingDaysTotal = countWeekdays(periodStart, periodEnd)

  /*
   * TASK-893 Slice 3 — per-member participation window resolution.
   *
   * - Flag OFF (default) → `participationByMember = null` → the for-loop uses
   *   the legacy scalar `actualToDateFactor` uniformly per member.
   *   Output is BIT-FOR-BIT identical to pre-TASK-893 behavior.
   *
   * - Flag ON → resolver returns a Map; per member we compose
   *   `finalFactor = participationFactor × actualToDateFactor`.
   *
   * - Flag ON + resolver throws → wrapper captures Sentry + returns null →
   *   degrades to legacy. Projected payroll NEVER crashes.
   */
  const participationByMember = await maybeResolveParticipationWindows(
    compensations.map(c => c.memberId),
    periodStart,
    periodEnd
  )

  // 3. Build projected entry for each member
  /*
   * `actualToDateFactor` is the legacy period-wide scalar (renamed from
   * `prorationFactor` for clarity). It is composed multiplicatively with
   * the per-member `participationFactor` when TASK-893 is ON.
   */
  const actualToDateFactor = mode === 'actual_to_date' && workingDaysTotal > 0 ? workingDaysCut / workingDaysTotal : 1

  const entries: ProjectedPayrollEntry[] = []

  for (const compensation of compensations) {
    const kpi = kpiMap.get(compensation.memberId) ?? null
    const attendance = attendanceSnapshots.get(compensation.memberId) ?? null

    const fullEntry = await buildPayrollEntry({
      periodId,
      periodDate: periodEnd,
      compensation,
      ufValue,
      bonusConfig,
      kpi,
      attendance
    })

    /*
     * Compose the per-member factor. When TASK-893 is OFF (or degraded to
     * null), `participationFactor = 1` and the composed factor reduces to
     * the legacy `actualToDateFactor`. When TASK-893 is ON, the per-member
     * `participationFactor` truncates the entry to the eligible window.
     *
     * Members absent from the participation map (no compensation overlap)
     * are NOT reachable in this loop — `compensations` already filtered
     * them upstream via `getApplicableCompensationVersionsForPeriod`.
     */
    const participation = participationByMember?.get(compensation.memberId) ?? null
    const participationFactor = participation?.prorationFactor ?? 1
    const finalFactor = participationFactor * actualToDateFactor

    const entry = prorateEntry(fullEntry, finalFactor)

    entries.push({
      ...entry,
      projectionMode: mode,
      asOfDate,
      projectedWorkingDays: workingDaysCut,
      projectedWorkingDaysTotal: workingDaysTotal,
      prorationFactor: finalFactor
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
    attendanceDiagnostics,
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
