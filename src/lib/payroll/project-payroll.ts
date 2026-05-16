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
 * TASK-893 Slice 4 BL-1 — Prorate the compensation BEFORE `buildPayrollEntry`.
 *
 * **Why**: when TASK-893 flag is ON, the previous Slice 3 approach
 * (`prorateEntry(fullEntry, finalFactor)`) rescaled the full output linearly
 * — including fields with non-linear semantics:
 *
 * - `chileGratificacionLegalAmount` has a MONTHLY cap (4.75 × IMM ÷ 12 Art 50
 *   CT). Rescaling post-hoc double-prorrates rows already at the cap.
 * - `chileTotalDeductions` is an aggregate computed from contribution bases.
 *   Rescaling the aggregate ≠ recomputing from prorated bases.
 * - `siiRetentionAmount` for honorarios should reflect retention on prorated
 *   gross — rescaling is mathematically equivalent but loses traceability.
 *
 * **Canonical fix** (payroll auditor 2026-05-16): scale the *inputs* to
 * `buildPayrollEntry` first; let the canonical calculator recompute
 * deductions, gratificación legal cap, and retención SII from the prorated
 * bases.
 *
 * **What scales** (proportional to time worked):
 * - `baseSalary`, `remoteAllowance`, `fixedBonusAmount`
 * - `bonusOtdMin/Max`, `bonusRpaMin/Max` (KPI bonus caps proportional)
 * - `apvAmount` (voluntary contribution proportional to imponible base)
 *
 * **What does NOT scale** (asignaciones no imponibles fijas — Chilean
 * jurisprudence does NOT auto-prorate by days not worked at contract entry;
 * the decision is contractual, not automatic):
 * - `colacionAmount`, `movilizacionAmount`
 *
 * **Identity preserved** (non-monetary or rate-based):
 * - `afpName/afpRate`, `healthSystem`, `unemploymentRate`, `contractType`,
 *   `payRegime`, `payrollVia`, etc.
 *
 * **HR Open Question Q-4** (gratificación legal in entry month): Chilean
 * jurisprudence (Dictamen DT 2937/050, 2002) supports "0 in entry month".
 * V1 conservative defers to `buildPayrollEntry`'s canonical cap-aware
 * recompute — which produces the smallest legal amount given the prorated
 * gross, NOT zero. HR/Finance signoff in V1.1 may override to set
 * `gratificacionLegalMode='ninguna'` for entry month or extend the resolver
 * with a "first-month flag".
 *
 * Pure function. Used only on the flag-ON path; flag OFF preserves legacy
 * bit-for-bit (this helper is not called).
 */
const prorateCompensationForParticipationWindow = <T extends {
  baseSalary: number
  remoteAllowance: number
  fixedBonusAmount: number
  bonusOtdMin: number
  bonusOtdMax: number
  bonusRpaMin: number
  bonusRpaMax: number
  apvAmount: number
}>(
  compensation: T,
  factor: number
): T => {
  /*
   * Factor at or above 1 → no scaling needed. Equivalent to identity for
   * full_period policy (factor=1). Guards against propagating > 1 factors
   * by accident — those would inflate, which is never desired.
   */
  if (factor >= 1) return compensation

  /*
   * Factor at 0 → exclude. The caller should have filtered the member out
   * upstream (policy='exclude'). Defensive: if it slips through, produce
   * all-zero monetary fields rather than negative values from rounding.
   */
  if (factor <= 0) {
    return {
      ...compensation,
      baseSalary: 0,
      remoteAllowance: 0,
      fixedBonusAmount: 0,
      bonusOtdMin: 0,
      bonusOtdMax: 0,
      bonusRpaMin: 0,
      bonusRpaMax: 0,
      apvAmount: 0
    }
  }

  const s = (v: number) => roundCurrency(v * factor)

  return {
    ...compensation,
    baseSalary: s(compensation.baseSalary),
    remoteAllowance: s(compensation.remoteAllowance),
    fixedBonusAmount: s(compensation.fixedBonusAmount),
    bonusOtdMin: s(compensation.bonusOtdMin),
    bonusOtdMax: s(compensation.bonusOtdMax),
    bonusRpaMin: s(compensation.bonusRpaMin),
    bonusRpaMax: s(compensation.bonusRpaMax),
    apvAmount: s(compensation.apvAmount)
    /*
     * colacionAmount + movilizacionAmount intentionally preserved (legacy
     * preserved). See JSDoc above for rationale.
     */
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

    /*
     * Resolve per-member participation factor.
     * - Flag OFF (or degraded) → participationFactor = 1 → no compensation
     *   scaling, no behavioral change vs pre-TASK-893.
     * - Flag ON → participation truncates per the resolved window. Factor
     *   is baked into the compensation BEFORE buildPayrollEntry so the
     *   canonical calculator recomputes deductions / gratificación / SII
     *   retention from the prorated gross (BL-1 fix — auditor 2026-05-16).
     */
    const participation = participationByMember?.get(compensation.memberId) ?? null
    const participationFactor = participation?.prorationFactor ?? 1

    const effectiveCompensation =
      participationFactor < 1
        ? prorateCompensationForParticipationWindow(compensation, participationFactor)
        : compensation

    const fullEntry = await buildPayrollEntry({
      periodId,
      periodDate: periodEnd,
      compensation: effectiveCompensation,
      ufValue,
      bonusConfig,
      kpi,
      attendance
    })

    /*
     * `prorateEntry` now applies ONLY the legacy `actualToDateFactor` on
     * top of the entry. When flag OFF, this is the legacy bit-for-bit
     * behavior (participationFactor=1 means effectiveCompensation =
     * compensation). When flag ON, the participation truncation is
     * already baked into the entry monetary fields via the prorated
     * compensation; `prorateEntry` here scales further by the
     * actual-to-date factor (proyection mode `actual_to_date` only,
     * factor=1 for `projected_month_end`).
     *
     * Output `prorationFactor` field is the composed factor for
     * operator surface transparency (shows the full effective factor
     * regardless of which path produced it).
     */
    const entry = prorateEntry(fullEntry, actualToDateFactor)
    const finalFactor = participationFactor * actualToDateFactor

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
