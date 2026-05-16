import 'server-only'

import type {
  BonusProrationConfig,
  CompensationVersion,
  PayrollCalculationResult,
  PayrollEntry,
  PayrollKpiSnapshot,
  PayrollProjectionContext
} from '@/types/payroll'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { getHistoricalEconomicIndicatorForPeriod } from '@/lib/finance/economic-indicators'
import { DEFAULT_BONUS_PRORATION_CONFIG, normalizeBonusProrationConfig } from '@/lib/payroll/bonus-config'
import { calculateOtdBonus, calculateRpaBonus } from '@/lib/payroll/bonus-proration'
import { calculateHonorariosTotals } from '@/lib/payroll/calculate-honorarios'
import { calculatePayrollTotals } from '@/lib/payroll/calculate-chile-deductions'
import {
  requiresPayrollAttendanceSignal,
  requiresPayrollChileTaxTable,
  requiresPayrollKpi
} from '@/lib/payroll/compensation-requirements'
import { computeChileTax } from '@/lib/payroll/compute-chile-tax'
import { fetchAttendanceForPayrollPeriod } from '@/lib/payroll/fetch-attendance-for-period'
import { fetchKpisForPeriod } from '@/lib/payroll/fetch-kpis-for-period'
import { getApplicableCompensationVersionsForPeriod } from '@/lib/payroll/get-compensation'
import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import {
  isPayrollParticipationWindowEnabled,
  prorateCompensationForParticipationWindow,
  resolvePayrollParticipationWindowsForMembers
} from '@/lib/payroll/participation-window'
import { captureWithDomain } from '@/lib/observability/capture'
import {
  canRecalculatePayrollPeriod,
  isPayrollPeriodReopened,
  isReopenedRecomputeBlockedByParticipationWindow
} from '@/lib/payroll/period-lifecycle'
import { upsertPayrollEntry } from '@/lib/payroll/persist-entry'
import { supersedePayrollEntryOnRecalculate } from '@/lib/payroll/supersede-entry'
import { applyAdjustmentsToEntry } from '@/lib/payroll/adjustments/apply-to-entry'
import { cloneActiveAdjustmentsToV2 } from '@/lib/payroll/adjustments/apply-adjustment'
import { ensurePayrollInfrastructure } from '@/lib/payroll/schema'
import { PayrollValidationError, getPeriodRangeFromId, runPayrollQuery, toNumber } from '@/lib/payroll/shared'
import {
  isPayrollPostgresEnabled,
  pgDeleteStalePayrollEntries,
  pgGetActiveBonusConfig,
  pgSetPeriodCalculated
} from '@/lib/payroll/postgres-store'
import { resolvePayrollTaxTableVersion } from '@/lib/payroll/tax-table-version'
import { contractAllowsRemoteAllowance } from '@/types/hr-contracts'

type BonusConfigRow = {
  otd_threshold: number | string | null
  rpa_threshold: number | string | null
  otd_floor: number | string | null
  rpa_full_payout_threshold: number | string | null
  rpa_soft_band_end: number | string | null
  rpa_soft_band_floor_factor: number | string | null
}

const getProjectId = () => getBigQueryProjectId()

const getBonusConfigForDate = async (periodEnd: string): Promise<BonusProrationConfig> => {
  if (isPayrollPostgresEnabled()) {
    const config = await pgGetActiveBonusConfig(periodEnd)

    return normalizeBonusProrationConfig(config)
  }

  const projectId = getProjectId()

  const [row] = await runPayrollQuery<BonusConfigRow>(
    `
      SELECT
        otd_threshold,
        rpa_threshold,
        otd_floor,
        rpa_full_payout_threshold,
        rpa_soft_band_end,
        rpa_soft_band_floor_factor
      FROM \`${projectId}.greenhouse.payroll_bonus_config\`
      WHERE effective_from <= DATE(@periodEnd)
      ORDER BY effective_from DESC
      LIMIT 1
    `,
    { periodEnd }
  )

  return normalizeBonusProrationConfig(
    row
      ? {
          otdThreshold: toNumber(row.otd_threshold),
          otdFloor: row.otd_floor != null ? toNumber(row.otd_floor) : DEFAULT_BONUS_PRORATION_CONFIG.otdFloor,
          rpaThreshold: toNumber(row.rpa_threshold),
          rpaFullPayoutThreshold:
            row.rpa_full_payout_threshold != null
              ? toNumber(row.rpa_full_payout_threshold)
              : DEFAULT_BONUS_PRORATION_CONFIG.rpaFullPayoutThreshold,
          rpaSoftBandEnd:
            row.rpa_soft_band_end != null
              ? toNumber(row.rpa_soft_band_end)
              : DEFAULT_BONUS_PRORATION_CONFIG.rpaSoftBandEnd,
          rpaSoftBandFloorFactor:
            row.rpa_soft_band_floor_factor != null
              ? toNumber(row.rpa_soft_band_floor_factor)
              : DEFAULT_BONUS_PRORATION_CONFIG.rpaSoftBandFloorFactor
        }
      : undefined
  )
}

type AttendanceSnapshot = {
  workingDaysInPeriod: number
  daysPresent: number
  daysAbsent: number
  daysOnLeave: number
  daysOnUnpaidLeave: number
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100

const hasAttendanceSignal = (attendance: AttendanceSnapshot | null | undefined) => {
  if (!attendance) {
    return false
  }

  return (
    attendance.daysPresent > 0 ||
    attendance.daysAbsent > 0 ||
    attendance.daysOnLeave > 0 ||
    attendance.daysOnUnpaidLeave > 0
  )
}

const resolvePayrollPeriodIndicators = async ({
  periodId,
  periodUfValue,
  taxTableVersion,
  indicatorPeriodDate
}: {
  periodId: string
  periodUfValue: number | null
  taxTableVersion: string | null
  indicatorPeriodDate?: string | null
}) => {
  const { periodEnd } = getPeriodRangeFromId(periodId)
  const resolvedIndicatorDate = indicatorPeriodDate || periodEnd

  const ufValue =
    typeof periodUfValue === 'number'
      ? periodUfValue
      : ((
          await getHistoricalEconomicIndicatorForPeriod({
            indicatorCode: 'UF',
            periodDate: resolvedIndicatorDate
          })
        )?.value ?? null)

  const utmValue = taxTableVersion
    ? ((
        await getHistoricalEconomicIndicatorForPeriod({
          indicatorCode: 'UTM',
          periodDate: resolvedIndicatorDate
        })
      )?.value ?? null)
    : null

  return { ufValue, utmValue }
}

export const buildPayrollEntry = async ({
  periodId,
  periodDate,
  compensation,
  ufValue,
  bonusConfig,
  kpi,
  attendance
}: {
  periodId: string
  periodDate: string
  compensation: CompensationVersion
  ufValue: number | null
  bonusConfig: BonusProrationConfig
  kpi: PayrollKpiSnapshot | null
  attendance: AttendanceSnapshot | null
}): Promise<PayrollEntry> => {
  const kpiOtdPercent = kpi?.otdPercent ?? null
  const kpiRpaAvg = kpi?.rpaAvg ?? null
  const usesDiscretionaryBonuses = compensation.contractType === 'honorarios'
  const skipsAttendanceAdjustments = compensation.contractType === 'honorarios' || compensation.payrollVia === 'deel'
  const remoteAllowanceEnabled = contractAllowsRemoteAllowance(compensation.contractType)
  const effectiveRemoteAllowance = remoteAllowanceEnabled ? compensation.remoteAllowance : 0

  const otdResult = usesDiscretionaryBonuses
    ? { amount: 0, qualifies: true, prorationFactor: null }
    : calculateOtdBonus(kpiOtdPercent, compensation.bonusOtdMax, bonusConfig)

  const rpaResult = usesDiscretionaryBonuses
    ? { amount: 0, qualifies: true, prorationFactor: null }
    : calculateRpaBonus(kpiRpaAvg, compensation.bonusRpaMax, bonusConfig)

  const bonusOtdAmount = otdResult.amount
  const bonusRpaAmount = rpaResult.amount

  // Attendance-based adjustments
  const deductibleDays = skipsAttendanceAdjustments
    ? 0
    : attendance
      ? attendance.daysAbsent + attendance.daysOnUnpaidLeave
      : 0

  const workingDays = skipsAttendanceAdjustments ? 22 : (attendance?.workingDaysInPeriod ?? 22)
  const attendanceRatio = workingDays > 0 ? Math.max(0, (workingDays - deductibleDays) / workingDays) : 1

  const adjustedBaseSalary =
    deductibleDays > 0 ? roundCurrency(compensation.baseSalary * attendanceRatio) : compensation.baseSalary

  const adjustedRemoteAllowance =
    deductibleDays > 0 ? roundCurrency(effectiveRemoteAllowance * attendanceRatio) : effectiveRemoteAllowance

  const adjustedColacionAmount =
    deductibleDays > 0
      ? roundCurrency((compensation.colacionAmount ?? 0) * attendanceRatio)
      : (compensation.colacionAmount ?? 0)

  const adjustedMovilizacionAmount =
    deductibleDays > 0
      ? roundCurrency((compensation.movilizacionAmount ?? 0) * attendanceRatio)
      : (compensation.movilizacionAmount ?? 0)

  const adjustedFixedBonusAmount =
    deductibleDays > 0 ? roundCurrency(compensation.fixedBonusAmount * attendanceRatio) : compensation.fixedBonusAmount

  const honorariosTotals =
    compensation.contractType === 'honorarios'
      ? calculateHonorariosTotals({
          periodDate,
          baseSalary: adjustedBaseSalary,
          fixedBonusAmount: adjustedFixedBonusAmount,
          bonusOtdAmount,
          bonusRpaAmount,
          bonusOtherAmount: 0
        })
      : null

  const deelGrossTotal =
    compensation.payrollVia === 'deel'
      ? roundCurrency(adjustedBaseSalary + adjustedRemoteAllowance + adjustedFixedBonusAmount + bonusOtdAmount + bonusRpaAmount)
      : null

  const totals = honorariosTotals
    ? {
        grossTotal: honorariosTotals.grossTotal,
        netTotalCalculated: honorariosTotals.netTotalCalculated,
        chileAfpName: null,
        chileAfpRate: null,
        chileAfpAmount: null,
        chileAfpCotizacionAmount: null,
        chileAfpComisionAmount: null,
        chileGratificacionLegalAmount: null,
        chileColacionAmount: null,
        chileMovilizacionAmount: null,
        chileHealthSystem: null,
        chileHealthAmount: null,
        chileHealthObligatoriaAmount: null,
        chileHealthVoluntariaAmount: null,
        chileEmployerSisAmount: null,
        chileEmployerCesantiaAmount: null,
        chileEmployerMutualAmount: null,
        chileEmployerTotalCost: null,
        chileUnemploymentRate: null,
        chileUnemploymentAmount: null,
        chileTaxableBase: honorariosTotals.grossTotal,
        chileTaxAmount: null,
        chileApvAmount: null,
        chileUfValue: null,
        chileTotalDeductions: honorariosTotals.siiRetentionAmount
      }
    : compensation.payrollVia === 'deel'
      ? {
          grossTotal: deelGrossTotal ?? 0,
          netTotalCalculated: deelGrossTotal ?? 0,
          chileAfpName: null,
          chileAfpRate: null,
          chileAfpAmount: null,
          chileAfpCotizacionAmount: null,
          chileAfpComisionAmount: null,
          chileGratificacionLegalAmount: null,
          chileColacionAmount: null,
          chileMovilizacionAmount: null,
          chileHealthSystem: null,
          chileHealthAmount: null,
          chileHealthObligatoriaAmount: null,
          chileHealthVoluntariaAmount: null,
          chileEmployerSisAmount: null,
          chileEmployerCesantiaAmount: null,
          chileEmployerMutualAmount: null,
          chileEmployerTotalCost: null,
          chileUnemploymentRate: null,
          chileUnemploymentAmount: null,
          chileTaxableBase: null,
          chileTaxAmount: null,
          chileApvAmount: null,
          chileUfValue: null,
          chileTotalDeductions: 0
        }
      : await calculatePayrollTotals({
          payRegime: compensation.payRegime,
          baseSalary: adjustedBaseSalary,
          remoteAllowance: adjustedRemoteAllowance,
          colacionAmount: adjustedColacionAmount,
          movilizacionAmount: adjustedMovilizacionAmount,
          fixedBonusAmount: adjustedFixedBonusAmount,
          bonusOtdAmount,
          bonusRpaAmount,
          bonusOtherAmount: 0,
          gratificacionLegalMode: compensation.gratificacionLegalMode,
          afpName: compensation.afpName,
          afpRate: compensation.afpRate,
          afpCotizacionRate: compensation.afpCotizacionRate,
          afpComisionRate: compensation.afpComisionRate,
          healthSystem: compensation.healthSystem,
          healthPlanUf: compensation.healthPlanUf,
          unemploymentRate: compensation.unemploymentRate,
          contractType: compensation.contractType,
          hasApv: compensation.hasApv,
          apvAmount: compensation.apvAmount,
          ufValue,
          taxAmount: 0,
          periodDate
        })

  return {
    entryId: `${periodId}_${compensation.memberId}`,
    periodId,
    memberId: compensation.memberId,
    memberName: compensation.memberName,
    memberEmail: compensation.memberEmail,
    memberAvatarUrl: compensation.memberAvatarUrl,
    compensationVersionId: compensation.versionId,
    payRegime: compensation.payRegime,
    contractTypeSnapshot: compensation.contractType,
    payrollVia: compensation.payrollVia,
    currency: compensation.currency,
    baseSalary: compensation.baseSalary,
    remoteAllowance: remoteAllowanceEnabled ? compensation.remoteAllowance : 0,
    colacionAmount: compensation.contractType === 'honorarios' ? 0 : compensation.colacionAmount,
    movilizacionAmount: compensation.contractType === 'honorarios' ? 0 : compensation.movilizacionAmount,
    fixedBonusLabel: compensation.fixedBonusLabel,
    fixedBonusAmount: compensation.fixedBonusAmount,
    kpiOtdPercent,
    kpiRpaAvg,
    kpiOtdQualifies: otdResult.qualifies,
    kpiRpaQualifies: rpaResult.qualifies,
    kpiTasksCompleted: kpi ? kpi.tasksCompleted : null,
    kpiDataSource: kpi ? kpi.dataSource : compensation.payrollVia === 'deel' ? 'external' : 'manual',
    bonusOtdAmount,
    bonusRpaAmount,
    bonusOtherAmount: 0,
    bonusOtherDescription: null,
    grossTotal: totals.grossTotal,
    bonusOtdMin: compensation.bonusOtdMin,
    bonusOtdMax: compensation.bonusOtdMax,
    bonusRpaMin: compensation.bonusRpaMin,
    bonusRpaMax: compensation.bonusRpaMax,
    chileAfpName: totals.chileAfpName,
    chileAfpRate: totals.chileAfpRate,
    chileAfpAmount: totals.chileAfpAmount,
    chileAfpCotizacionAmount: totals.chileAfpCotizacionAmount,
    chileAfpComisionAmount: totals.chileAfpComisionAmount,
    chileGratificacionLegalAmount: totals.chileGratificacionLegalAmount,
    chileColacionAmount: totals.chileColacionAmount,
    chileMovilizacionAmount: totals.chileMovilizacionAmount,
    chileHealthSystem: totals.chileHealthSystem,
    chileHealthAmount: totals.chileHealthAmount,
    chileHealthObligatoriaAmount: totals.chileHealthObligatoriaAmount,
    chileHealthVoluntariaAmount: totals.chileHealthVoluntariaAmount,
    chileEmployerSisAmount: totals.chileEmployerSisAmount,
    chileEmployerCesantiaAmount: totals.chileEmployerCesantiaAmount,
    chileEmployerMutualAmount: totals.chileEmployerMutualAmount,
    chileEmployerTotalCost: totals.chileEmployerTotalCost,
    chileUnemploymentRate: totals.chileUnemploymentRate,
    chileUnemploymentAmount: totals.chileUnemploymentAmount,
    chileTaxableBase: totals.chileTaxableBase,
    chileTaxAmount: totals.chileTaxAmount,
    siiRetentionRate: honorariosTotals?.siiRetentionRate ?? null,
    siiRetentionAmount: honorariosTotals?.siiRetentionAmount ?? null,
    chileApvAmount: totals.chileApvAmount,
    chileUfValue: totals.chileUfValue,
    chileTotalDeductions: totals.chileTotalDeductions,
    deelContractId: compensation.deelContractId,
    netTotalCalculated: totals.netTotalCalculated,
    netTotalOverride: null,
    netTotal: totals.netTotalCalculated,
    manualOverride: false,
    manualOverrideNote: null,
    bonusOtdProrationFactor: otdResult.prorationFactor,
    bonusRpaProrationFactor: rpaResult.prorationFactor,
    workingDaysInPeriod: skipsAttendanceAdjustments ? null : (attendance?.workingDaysInPeriod ?? null),
    daysPresent: skipsAttendanceAdjustments ? null : (attendance?.daysPresent ?? null),
    daysAbsent: skipsAttendanceAdjustments ? null : (attendance?.daysAbsent ?? null),
    daysOnLeave: skipsAttendanceAdjustments ? null : (attendance?.daysOnLeave ?? null),
    daysOnUnpaidLeave: skipsAttendanceAdjustments ? null : (attendance?.daysOnUnpaidLeave ?? null),
    adjustedBaseSalary: deductibleDays > 0 ? adjustedBaseSalary : null,
    adjustedRemoteAllowance: deductibleDays > 0 && remoteAllowanceEnabled ? adjustedRemoteAllowance : null,
    adjustedColacionAmount: deductibleDays > 0 ? adjustedColacionAmount : null,
    adjustedMovilizacionAmount: deductibleDays > 0 ? adjustedMovilizacionAmount : null,
    adjustedFixedBonusAmount: deductibleDays > 0 ? adjustedFixedBonusAmount : null,
    version: 1,
    isActive: true,
    supersededBy: null,
    reopenAuditId: null,
    createdAt: null,
    updatedAt: null
  }
}

export const calculatePayroll = async ({
  periodId,
  actorIdentifier,
  projectionContext
}: {
  periodId: string
  actorIdentifier: string | null
  projectionContext?: PayrollProjectionContext | null
}): Promise<PayrollCalculationResult> => {
  await ensurePayrollInfrastructure()
  const projectId = getProjectId()

  const period = await getPayrollPeriod(periodId)

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (!canRecalculatePayrollPeriod(period.status)) {
    throw new PayrollValidationError('Exported payroll periods cannot be recalculated.', 409)
  }

  /*
   * TASK-893 Slice 4 BL-5 — Reopened recompute guard bajo flag TASK-893 ON.
   *
   * Cuando `PAYROLL_PARTICIPATION_WINDOW_ENABLED=true` AND el período está
   * en estado `reopened` (path TASK-410 reliquidación), un recompute crearía
   * v2 entries con la NUEVA semántica de participación mientras v1 quedó
   * con la legacy. Eso produce asientos contradictorios contra:
   *
   * - DTE/F29 retención SII honorarios ya presentado bajo v1
   * - Cotización Previred ya pagada bajo v1
   * - Nota de crédito / nueva boleta sobre v2 con monto distinto
   *
   * V1 conservative (Opción B per ADR Delta 2026-05-16): bloquear el recompute.
   * Operador puede:
   *   - Si quiere recompute con nueva semántica → cancelar reopen + re-export
   *     same legacy → next period usa new semantic.
   *   - Si quiere correcciones manuales → editar entries en reopened sin
   *     trigger de recompute.
   *
   * V1.1 follow-up: capability `payroll.period.force_recompute` (EFEONCE_ADMIN
   * + FINANCE_ADMIN, reason >= 20 chars, audit row) permite override explícito.
   */
  if (isReopenedRecomputeBlockedByParticipationWindow(period.status, isPayrollParticipationWindowEnabled())) {
    throw new PayrollValidationError(
      'Reopened payroll period cannot be recalculated under participation window. Cancel reopen + re-export, or wait for V1.1 force_recompute capability.',
      409,
      { code: 'period_reopened_under_legacy_no_recompute', periodId, status: period.status }
    )
  }

  const range = getPeriodRangeFromId(periodId)

  const attendanceCutDate =
    projectionContext?.mode === 'actual_to_date'
      ? projectionContext.asOfDate < range.periodEnd
        ? projectionContext.asOfDate
        : range.periodEnd
      : range.periodEnd

  const allRows = await getApplicableCompensationVersionsForPeriod(range.periodStart, range.periodEnd)
  const compensationRows = allRows.filter(row => row.hasCompensationVersion)
  const missingCompensationMemberIds = allRows.filter(row => !row.hasCompensationVersion).map(row => row.memberId)

  if (compensationRows.length === 0) {
    throw new PayrollValidationError('No active team members have a compensation version for this period.', 400, {
      memberIds: missingCompensationMemberIds
    })
  }

  const requiresUfValue = compensationRows.some(
    row => row.payRegime === 'chile' && row.healthSystem === 'isapre' && (row.healthPlanUf || 0) > 0
  )

  const includesChilePayroll = compensationRows.some(requiresPayrollChileTaxTable)
  const kpiRequiredMemberIds = compensationRows.filter(requiresPayrollKpi).map(row => row.memberId)
  const attendanceRequiredMemberIds = compensationRows.filter(requiresPayrollAttendanceSignal).map(row => row.memberId)

  const resolvedTaxTableVersion = includesChilePayroll
    ? await resolvePayrollTaxTableVersion({
        year: period.year,
        month: period.month,
        requestedVersion: period.taxTableVersion,
        allowMonthFallbackForRequestedVersion: true
      })
    : null

  const indicatorValues = await resolvePayrollPeriodIndicators({
    periodId,
    periodUfValue: period.ufValue,
    taxTableVersion: resolvedTaxTableVersion,
    indicatorPeriodDate: projectionContext?.asOfDate ?? null
  })

  if (requiresUfValue && typeof indicatorValues.ufValue !== 'number') {
    throw new PayrollValidationError('This payroll period requires ufValue to calculate Isapre deductions.', 400)
  }

  if (includesChilePayroll && !resolvedTaxTableVersion) {
    throw new PayrollValidationError(
      'This payroll period requires a synchronized Chile tax table for the selected month before Chile payroll can be calculated.',
      400
    )
  }

  if (includesChilePayroll && resolvedTaxTableVersion && typeof indicatorValues.utmValue !== 'number') {
    throw new PayrollValidationError(
      'This payroll period requires a historical UTM value to calculate Chile payroll taxes.',
      400
    )
  }

  const [bonusConfig, kpiData, attendanceResult] = await Promise.all([
    getBonusConfigForDate(range.periodEnd),
    fetchKpisForPeriod({
      memberIds: kpiRequiredMemberIds,
      periodYear: range.year,
      periodMonth: range.month
    }),
    fetchAttendanceForPayrollPeriod(attendanceRequiredMemberIds, range.periodStart, attendanceCutDate)
  ])

  if (attendanceResult.leaveDataDegraded) {
    throw new PayrollValidationError(
      'Leave data unavailable from PostgreSQL. Official payroll calculation cannot continue.',
      503
    )
  }

  const attendanceData = attendanceResult.snapshots

  const missingKpiMemberIds = kpiRequiredMemberIds.filter(memberId => !kpiData.snapshots.has(memberId))

  const missingAttendanceMemberIds = attendanceRequiredMemberIds.filter(
    memberId => !hasAttendanceSignal(attendanceData.get(memberId))
  )

  if (missingKpiMemberIds.length > 0) {
    throw new PayrollValidationError(
      'This payroll period requires ICO KPI data for every collaborator with variable bonuses before payroll can be calculated.',
      400,
      { memberIds: missingKpiMemberIds }
    )
  }

  if (missingAttendanceMemberIds.length > 0) {
    throw new PayrollValidationError(
      'This payroll period requires attendance or leave signals for every collaborator whose pay depends on attendance before payroll can be calculated.',
      400,
      { memberIds: missingAttendanceMemberIds }
    )
  }

  /*
   * TASK-893 Slice 4 BL-2 — Resolve per-member participation windows BEFORE
   * the official calculation loop. Mirror of `project-payroll.ts:269`
   * `maybeResolveParticipationWindows`, adapted for the write path with
   * defensive degradation:
   *
   * - Flag OFF (default) → returns `null` → for-loop falls back to legacy
   *   path bit-for-bit (no compensation scaling, no skip).
   * - Flag ON happy path → returns Map<memberId, PayrollParticipationWindow>.
   * - Flag ON + resolver throws → captureWithDomain + null → degrades to
   *   legacy. Write path NEVER crashes due to participation resolver failure.
   *
   * Read-only call to PG. Safe to invoke before opening the write
   * transaction.
   */
  const participationByMember = isPayrollParticipationWindowEnabled()
    ? await resolvePayrollParticipationWindowsForMembers(
        compensationRows.map(c => c.memberId),
        range.periodStart,
        range.periodEnd
      ).catch((err: unknown) => {
        captureWithDomain(err, 'payroll', {
          extra: {
            source: 'calculate_payroll.participation_window_resolve_failed',
            periodId,
            periodStart: range.periodStart,
            periodEnd: range.periodEnd,
            memberCount: compensationRows.length
          }
        })

        return null
      })
    : null

  const entries: PayrollEntry[] = []
  const excludedMemberIds: string[] = []

  for (const compensation of compensationRows) {
    /*
     * TASK-893 Slice 4 BL-2 — Per-member participation resolution.
     *
     * - Flag OFF or no participation entry → factor=1 → no compensation
     *   scaling, no behavior change vs pre-TASK-893.
     * - Flag ON + factor>0 + factor<1 → prorate compensation BEFORE
     *   buildPayrollEntry. The canonical Chile calculator recomputes
     *   deductions, gratificación legal cap, and retención SII from the
     *   prorated bases (BL-1 pattern, validated by payroll auditor 2026-05-16).
     * - Flag ON + factor=0 (policy='exclude') → SKIP member entirely. No
     *   payroll_entries row persisted. Critical: do NOT emit zero-amount
     *   entries (would corrupt DTE/F29 cross-validation).
     */
    const participation = participationByMember?.get(compensation.memberId) ?? null
    const participationFactor = participation?.prorationFactor ?? 1

    if (participationFactor <= 0) {
      excludedMemberIds.push(compensation.memberId)
      continue
    }

    const effectiveCompensation =
      participationFactor < 1
        ? prorateCompensationForParticipationWindow(compensation, participationFactor)
        : compensation

    const kpi = kpiData.snapshots.get(compensation.memberId) || null

    const attendance = attendanceData.get(compensation.memberId) ?? null

    let entry = await buildPayrollEntry({
      periodId,
      periodDate: range.periodEnd,
      compensation: effectiveCompensation,
      ufValue: indicatorValues.ufValue,
      bonusConfig,
      kpi,
      attendance
    })

    if (requiresPayrollChileTaxTable(compensation) && resolvedTaxTableVersion) {
      const taxResult = await computeChileTax({
        taxableBaseClp: entry.chileTaxableBase ?? 0,
        taxTableVersion: resolvedTaxTableVersion,
        utmValue: indicatorValues.utmValue
      })

      /*
       * TASK-893 Slice 4 BL-2 — Second-pass calculator receives the prorated
       * compensation inputs (NOT the original). Adjusted overrides from
       * TASK-745 (entry.adjusted*) still take priority when present.
       * Without this fix, the recompute of deductions / gratificación would
       * use the FULL baseSalary while the entry has the prorated gross —
       * the exact double-prorrateo bug class that BL-1 closes for projected.
       */
      const totalsWithTax = await calculatePayrollTotals({
        payRegime: effectiveCompensation.payRegime,
        baseSalary: entry.adjustedBaseSalary ?? effectiveCompensation.baseSalary,
        remoteAllowance: entry.adjustedRemoteAllowance ?? effectiveCompensation.remoteAllowance,
        colacionAmount: entry.adjustedColacionAmount ?? effectiveCompensation.colacionAmount,
        movilizacionAmount: entry.adjustedMovilizacionAmount ?? effectiveCompensation.movilizacionAmount,
        fixedBonusAmount: entry.adjustedFixedBonusAmount ?? effectiveCompensation.fixedBonusAmount,
        bonusOtdAmount: entry.bonusOtdAmount,
        bonusRpaAmount: entry.bonusRpaAmount,
        bonusOtherAmount: entry.bonusOtherAmount,
        gratificacionLegalMode: effectiveCompensation.gratificacionLegalMode,
        afpName: effectiveCompensation.afpName,
        afpRate: effectiveCompensation.afpRate,
        afpCotizacionRate: effectiveCompensation.afpCotizacionRate,
        afpComisionRate: effectiveCompensation.afpComisionRate,
        healthSystem: effectiveCompensation.healthSystem,
        healthPlanUf: effectiveCompensation.healthPlanUf,
        unemploymentRate: effectiveCompensation.unemploymentRate,
        contractType: effectiveCompensation.contractType,
        hasApv: effectiveCompensation.hasApv,
        apvAmount: effectiveCompensation.apvAmount,
        ufValue: indicatorValues.ufValue,
        taxAmount: taxResult.taxAmountClp,
        periodDate: range.periodEnd
      })

      entry = {
        ...entry,
        grossTotal: totalsWithTax.grossTotal,
        chileAfpName: totalsWithTax.chileAfpName,
        chileAfpRate: totalsWithTax.chileAfpRate,
        chileAfpAmount: totalsWithTax.chileAfpAmount,
        chileAfpCotizacionAmount: totalsWithTax.chileAfpCotizacionAmount,
        chileAfpComisionAmount: totalsWithTax.chileAfpComisionAmount,
        chileGratificacionLegalAmount: totalsWithTax.chileGratificacionLegalAmount,
        chileColacionAmount: totalsWithTax.chileColacionAmount,
        chileMovilizacionAmount: totalsWithTax.chileMovilizacionAmount,
        chileHealthSystem: totalsWithTax.chileHealthSystem,
        chileHealthAmount: totalsWithTax.chileHealthAmount,
        chileHealthObligatoriaAmount: totalsWithTax.chileHealthObligatoriaAmount,
        chileHealthVoluntariaAmount: totalsWithTax.chileHealthVoluntariaAmount,
        chileEmployerSisAmount: totalsWithTax.chileEmployerSisAmount,
        chileEmployerCesantiaAmount: totalsWithTax.chileEmployerCesantiaAmount,
        chileEmployerMutualAmount: totalsWithTax.chileEmployerMutualAmount,
        chileEmployerTotalCost: totalsWithTax.chileEmployerTotalCost,
        chileUnemploymentRate: totalsWithTax.chileUnemploymentRate,
        chileUnemploymentAmount: totalsWithTax.chileUnemploymentAmount,
        chileTaxableBase: totalsWithTax.chileTaxableBase,
        chileTaxAmount: totalsWithTax.chileTaxAmount,
        chileApvAmount: totalsWithTax.chileApvAmount,
        chileUfValue: totalsWithTax.chileUfValue,
        chileTotalDeductions: totalsWithTax.chileTotalDeductions,
        netTotalCalculated: totalsWithTax.netTotalCalculated,
        netTotal: totalsWithTax.netTotalCalculated
      }
    }

    // TASK-745 — apply active payroll_adjustments before persisting. On the
    // first calculation no adjustments exist (entry_id has no row yet), so
    // this is a no-op. On subsequent recalculations after the operator
    // applied adjustments via API, the active adjustments override the
    // gross/SII/deductions/net of the entry deterministically.
    entry = await applyAdjustmentsToEntry(entry)

    // TASK-410/411 — when the period is reopened, each entry mutation must
    // go through the supersede path so that v1 stays immutable, v2 is
    // created/updated in place, and `payroll_entry.reliquidated` is emitted
    // for the finance delta consumer. The direct upsert path would update
    // v1 in place, break the versioning invariant, and silently skip the
    // delta publication.
    if (isPayrollPostgresEnabled() && isPayrollPeriodReopened(period.status)) {
      const v1EntryIdForClone = entry.entryId

      try {
        const supersedeResult = await supersedePayrollEntryOnRecalculate({
          updatedEntry: entry,
          actorUserId: actorIdentifier ?? 'system'
        })

        // TASK-745 — on first supersession (case A) the v2 row gets a fresh
        // entry_id; clone any active adjustments from the v1 row over to v2
        // so the operator's intent (exclude / factor / fixed_deduction)
        // survives the reopen. Idempotent: if v2 already had cloned rows
        // from a prior recalc, the active partial unique index prevents
        // duplicates and the clone helper logs and skips.
        if (
          supersedeResult.entryId !== v1EntryIdForClone &&
          supersedeResult.version >= 2
        ) {
          await cloneActiveAdjustmentsToV2({
            v1EntryId: v1EntryIdForClone,
            v2EntryId: supersedeResult.entryId,
            triggeredBy: actorIdentifier ?? 'system'
          }).catch(error => {
            console.warn(
              `[calculate-payroll] cloneActiveAdjustmentsToV2 failed for ${v1EntryIdForClone} → ${supersedeResult.entryId}:`,
              error instanceof Error ? error.message : String(error)
            )
          })
        }
      } catch (error) {
        // If no active row exists yet for (period, member) the supersede
        // flow can't compute a delta — this happens when calculate adds a
        // brand-new member mid-reopen. Fall back to direct upsert so the
        // new member materializes with version=1 / is_active=true. Emit a
        // console warning so ops can spot these edge cases in the logs.
        if (
          error &&
          typeof error === 'object' &&
          'message' in error &&
          String((error as { message?: unknown }).message).includes('No active payroll entry found')
        ) {
          console.warn(
            `[calculate-payroll] supersede fallback: member ${compensation.memberId} has no active entry for period ${periodId} — inserting as v1.`
          )
          await upsertPayrollEntry(entry)
        } else {
          throw error
        }
      }
    } else {
      await upsertPayrollEntry(entry)
    }

    entries.push(entry)
  }

  // TASK-410 — on reopened periods we never delete stale entries: v1 rows
  // must be preserved as the historical record, and any members who lose
  // compensation mid-reopen stay in the dataset for audit. `pgDelete...`
  // would cascade-drop v1 rows and leave Finance orphaned.
  if (isPayrollPostgresEnabled() && !isPayrollPeriodReopened(period.status)) {
    await pgDeleteStalePayrollEntries({
      periodId,
      keepMemberIds: compensationRows.map(row => row.memberId)
    })
  }

  if (isPayrollPostgresEnabled()) {
    await pgSetPeriodCalculated(periodId, actorIdentifier)
  } else {
    await runPayrollQuery(
      `
        UPDATE \`${projectId}.greenhouse.payroll_periods\`
        SET
          status = 'calculated',
          calculated_at = CURRENT_TIMESTAMP(),
          calculated_by = @actorIdentifier,
          approved_at = NULL,
          approved_by = NULL
        WHERE period_id = @periodId
      `,
      {
        periodId,
        actorIdentifier
      }
    )
  }

  const updatedPeriod = await getPayrollPeriod(periodId)

  if (!updatedPeriod) {
    throw new PayrollValidationError('Unable to read calculated payroll period.', 500)
  }

  return {
    period: updatedPeriod,
    entries: await getPayrollEntries(periodId),
    diagnostics: kpiData.diagnostics,
    attendanceDiagnostics: attendanceResult.diagnostics,
    missingKpiMemberIds,
    missingCompensationMemberIds
  }
}
