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
import { calculatePayrollTotals } from '@/lib/payroll/calculate-chile-deductions'
import { computeChileTax } from '@/lib/payroll/compute-chile-tax'
import { fetchAttendanceForPayrollPeriod } from '@/lib/payroll/fetch-attendance-for-period'
import { fetchKpisForPeriod } from '@/lib/payroll/fetch-kpis-for-period'
import { getApplicableCompensationVersionsForPeriod } from '@/lib/payroll/get-compensation'
import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { canRecalculatePayrollPeriod } from '@/lib/payroll/period-lifecycle'
import { upsertPayrollEntry } from '@/lib/payroll/persist-entry'
import { ensurePayrollInfrastructure } from '@/lib/payroll/schema'
import {
  PayrollValidationError,
  getPeriodRangeFromId,
  runPayrollQuery,
  toNumber
} from '@/lib/payroll/shared'
import {
  isPayrollPostgresEnabled,
  pgDeleteStalePayrollEntries,
  pgGetActiveBonusConfig,
  pgSetPeriodCalculated
} from '@/lib/payroll/postgres-store'

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

  const ufValue = typeof periodUfValue === 'number'
    ? periodUfValue
    : (await getHistoricalEconomicIndicatorForPeriod({
        indicatorCode: 'UF',
        periodDate: resolvedIndicatorDate
      }))?.value ?? null

  const utmValue = taxTableVersion
    ? (await getHistoricalEconomicIndicatorForPeriod({
        indicatorCode: 'UTM',
        periodDate: resolvedIndicatorDate
      }))?.value ?? null
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

  const otdResult = calculateOtdBonus(kpiOtdPercent, compensation.bonusOtdMax, bonusConfig)
  const rpaResult = calculateRpaBonus(kpiRpaAvg, compensation.bonusRpaMax, bonusConfig)

  const bonusOtdAmount = otdResult.amount
  const bonusRpaAmount = rpaResult.amount

  // Attendance-based adjustments
  const deductibleDays = attendance ? attendance.daysAbsent + attendance.daysOnUnpaidLeave : 0
  const workingDays = attendance?.workingDaysInPeriod ?? 22
  const attendanceRatio = workingDays > 0 ? Math.max(0, (workingDays - deductibleDays) / workingDays) : 1

  const adjustedBaseSalary = deductibleDays > 0
    ? roundCurrency(compensation.baseSalary * attendanceRatio)
    : compensation.baseSalary

  const adjustedRemoteAllowance = deductibleDays > 0
    ? roundCurrency(compensation.remoteAllowance * attendanceRatio)
    : compensation.remoteAllowance

  const adjustedFixedBonusAmount = deductibleDays > 0
    ? roundCurrency(compensation.fixedBonusAmount * attendanceRatio)
    : compensation.fixedBonusAmount

  const totals = await calculatePayrollTotals({
    payRegime: compensation.payRegime,
    baseSalary: adjustedBaseSalary,
    remoteAllowance: adjustedRemoteAllowance,
    fixedBonusAmount: adjustedFixedBonusAmount,
    bonusOtdAmount,
    bonusRpaAmount,
    bonusOtherAmount: 0,
    gratificacionLegalMode: compensation.gratificacionLegalMode,
    afpName: compensation.afpName,
    afpRate: compensation.afpRate,
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
    currency: compensation.currency,
    baseSalary: compensation.baseSalary,
    remoteAllowance: compensation.remoteAllowance,
    fixedBonusLabel: compensation.fixedBonusLabel,
    fixedBonusAmount: compensation.fixedBonusAmount,
    kpiOtdPercent,
    kpiRpaAvg,
    kpiOtdQualifies: otdResult.qualifies,
    kpiRpaQualifies: rpaResult.qualifies,
    kpiTasksCompleted: kpi ? kpi.tasksCompleted : null,
    kpiDataSource: kpi ? kpi.dataSource : 'manual',
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
    chileGratificacionLegalAmount: totals.chileGratificacionLegalAmount,
    chileHealthSystem: totals.chileHealthSystem,
    chileHealthAmount: totals.chileHealthAmount,
    chileUnemploymentRate: totals.chileUnemploymentRate,
    chileUnemploymentAmount: totals.chileUnemploymentAmount,
    chileTaxableBase: totals.chileTaxableBase,
    chileTaxAmount: totals.chileTaxAmount,
    chileApvAmount: totals.chileApvAmount,
    chileUfValue: totals.chileUfValue,
    chileTotalDeductions: totals.chileTotalDeductions,
    netTotalCalculated: totals.netTotalCalculated,
    netTotalOverride: null,
    netTotal: totals.netTotalCalculated,
    manualOverride: false,
    manualOverrideNote: null,
    bonusOtdProrationFactor: otdResult.prorationFactor,
    bonusRpaProrationFactor: rpaResult.prorationFactor,
    workingDaysInPeriod: attendance?.workingDaysInPeriod ?? null,
    daysPresent: attendance?.daysPresent ?? null,
    daysAbsent: attendance?.daysAbsent ?? null,
    daysOnLeave: attendance?.daysOnLeave ?? null,
    daysOnUnpaidLeave: attendance?.daysOnUnpaidLeave ?? null,
    adjustedBaseSalary: deductibleDays > 0 ? adjustedBaseSalary : null,
    adjustedRemoteAllowance: deductibleDays > 0 ? adjustedRemoteAllowance : null,
    adjustedFixedBonusAmount: deductibleDays > 0 ? adjustedFixedBonusAmount : null,
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

  const range = getPeriodRangeFromId(periodId)

  const attendanceCutDate =
    projectionContext?.mode === 'actual_to_date'
      ? (projectionContext.asOfDate < range.periodEnd ? projectionContext.asOfDate : range.periodEnd)
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

  const includesChilePayroll = compensationRows.some(row => row.payRegime === 'chile')

  const indicatorValues = await resolvePayrollPeriodIndicators({
    periodId,
    periodUfValue: period.ufValue,
    taxTableVersion: period.taxTableVersion,
    indicatorPeriodDate: projectionContext?.asOfDate ?? null
  })

  if (requiresUfValue && typeof indicatorValues.ufValue !== 'number') {
    throw new PayrollValidationError('This payroll period requires ufValue to calculate Isapre deductions.', 400)
  }

  if (includesChilePayroll && !period.taxTableVersion) {
    throw new PayrollValidationError('This payroll period requires taxTableVersion to calculate Chile payroll taxes.', 400)
  }

  if (includesChilePayroll && period.taxTableVersion && typeof indicatorValues.utmValue !== 'number') {
    throw new PayrollValidationError('This payroll period requires a historical UTM value to calculate Chile payroll taxes.', 400)
  }

  const memberIds = compensationRows.map(row => row.memberId)

  const [bonusConfig, kpiData, attendanceResult] = await Promise.all([
    getBonusConfigForDate(range.periodEnd),
    fetchKpisForPeriod({
      memberIds,
      periodYear: range.year,
      periodMonth: range.month
    }),
    fetchAttendanceForPayrollPeriod(memberIds, range.periodStart, attendanceCutDate)
  ])

  const attendanceData = attendanceResult.snapshots

  const entries: PayrollEntry[] = []
  const missingKpiMemberIds: string[] = []

  for (const compensation of compensationRows) {
    const kpi = kpiData.snapshots.get(compensation.memberId) || null

    if (!kpi) {
      missingKpiMemberIds.push(compensation.memberId)
    }

    const attendance = attendanceData.get(compensation.memberId) ?? null

    let entry = await buildPayrollEntry({
      periodId,
      periodDate: range.periodEnd,
      compensation,
      ufValue: indicatorValues.ufValue,
      bonusConfig,
      kpi,
      attendance
    })

    if (compensation.payRegime === 'chile' && period.taxTableVersion) {
      const taxResult = await computeChileTax({
        taxableBaseClp: entry.chileTaxableBase ?? 0,
        taxTableVersion: period.taxTableVersion,
        utmValue: indicatorValues.utmValue
      })

      const totalsWithTax = await calculatePayrollTotals({
        payRegime: compensation.payRegime,
        baseSalary: entry.adjustedBaseSalary ?? compensation.baseSalary,
        remoteAllowance: entry.adjustedRemoteAllowance ?? compensation.remoteAllowance,
        fixedBonusAmount: entry.adjustedFixedBonusAmount ?? compensation.fixedBonusAmount,
        bonusOtdAmount: entry.bonusOtdAmount,
        bonusRpaAmount: entry.bonusRpaAmount,
        bonusOtherAmount: entry.bonusOtherAmount,
        gratificacionLegalMode: compensation.gratificacionLegalMode,
        afpName: compensation.afpName,
        afpRate: compensation.afpRate,
        healthSystem: compensation.healthSystem,
        healthPlanUf: compensation.healthPlanUf,
        unemploymentRate: compensation.unemploymentRate,
        contractType: compensation.contractType,
        hasApv: compensation.hasApv,
        apvAmount: compensation.apvAmount,
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
        chileGratificacionLegalAmount: totalsWithTax.chileGratificacionLegalAmount,
        chileHealthSystem: totalsWithTax.chileHealthSystem,
        chileHealthAmount: totalsWithTax.chileHealthAmount,
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

    await upsertPayrollEntry(entry)
    entries.push(entry)
  }

  if (isPayrollPostgresEnabled()) {
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
