import 'server-only'

import type { BonusProrationConfig, CompensationVersion, PayrollCalculationResult, PayrollEntry, PayrollKpiSnapshot } from '@/types/payroll'

import { getBigQueryProjectId } from '@/lib/bigquery'
import { calculateOtdBonus, calculateRpaBonus } from '@/lib/payroll/bonus-proration'
import { calculatePayrollTotals } from '@/lib/payroll/calculate-chile-deductions'
import { fetchAttendanceForAllMembers } from '@/lib/payroll/fetch-attendance-for-period'
import { fetchKpisForPeriod } from '@/lib/payroll/fetch-kpis-for-period'
import { getApplicableCompensationVersionsForPeriod } from '@/lib/payroll/get-compensation'
import { getPayrollEntries } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
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
  pgGetActiveBonusConfig,
  pgSetPeriodCalculated
} from '@/lib/payroll/postgres-store'

type BonusConfigRow = {
  otd_threshold: number | string | null
  rpa_threshold: number | string | null
  otd_floor: number | string | null
}

const getProjectId = () => getBigQueryProjectId()

const getBonusConfigForDate = async (periodEnd: string): Promise<BonusProrationConfig> => {
  if (isPayrollPostgresEnabled()) {
    const config = await pgGetActiveBonusConfig()

    return {
      otdThreshold: config?.otdThreshold ?? 94,
      otdFloor: config?.otdFloor ?? 70,
      rpaThreshold: config?.rpaThreshold ?? 3
    }
  }

  const projectId = getProjectId()

  const [row] = await runPayrollQuery<BonusConfigRow>(
    `
      SELECT otd_threshold, rpa_threshold, otd_floor
      FROM \`${projectId}.greenhouse.payroll_bonus_config\`
      WHERE effective_from <= DATE(@periodEnd)
      ORDER BY effective_from DESC
      LIMIT 1
    `,
    { periodEnd }
  )

  return {
    otdThreshold: row ? toNumber(row.otd_threshold) : 94,
    otdFloor: row?.otd_floor != null ? toNumber(row.otd_floor) : 70,
    rpaThreshold: row ? toNumber(row.rpa_threshold) : 3
  }
}

type AttendanceSnapshot = {
  workingDaysInPeriod: number
  daysPresent: number
  daysAbsent: number
  daysOnLeave: number
  daysOnUnpaidLeave: number
}

const roundCurrency = (value: number) => Math.round(value * 100) / 100

const buildPayrollEntry = ({
  periodId,
  compensation,
  ufValue,
  bonusConfig,
  kpi,
  attendance
}: {
  periodId: string
  compensation: CompensationVersion
  ufValue: number | null
  bonusConfig: BonusProrationConfig
  kpi: PayrollKpiSnapshot | null
  attendance: AttendanceSnapshot | null
}): PayrollEntry => {
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

  const totals = calculatePayrollTotals({
    payRegime: compensation.payRegime,
    baseSalary: adjustedBaseSalary,
    remoteAllowance: adjustedRemoteAllowance,
    bonusOtdAmount,
    bonusRpaAmount,
    bonusOtherAmount: 0,
    afpName: compensation.afpName,
    afpRate: compensation.afpRate,
    healthSystem: compensation.healthSystem,
    healthPlanUf: compensation.healthPlanUf,
    unemploymentRate: compensation.unemploymentRate,
    contractType: compensation.contractType,
    hasApv: compensation.hasApv,
    apvAmount: compensation.apvAmount,
    ufValue,
    taxAmount: 0
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
    createdAt: null,
    updatedAt: null
  }
}

export const calculatePayroll = async ({
  periodId,
  actorIdentifier
}: {
  periodId: string
  actorIdentifier: string | null
}): Promise<PayrollCalculationResult> => {
  await ensurePayrollInfrastructure()
  const projectId = getProjectId()

  const period = await getPayrollPeriod(periodId)

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  if (period.status === 'approved' || period.status === 'exported') {
    throw new PayrollValidationError('Approved payroll periods cannot be recalculated.', 409)
  }

  const range = getPeriodRangeFromId(periodId)
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

  if (requiresUfValue && typeof period.ufValue !== 'number') {
    throw new PayrollValidationError('This payroll period requires ufValue to calculate Isapre deductions.', 400)
  }

  const memberIds = compensationRows.map(row => row.memberId)

  const [bonusConfig, kpiData, attendanceData] = await Promise.all([
    getBonusConfigForDate(range.periodEnd),
    fetchKpisForPeriod({
      memberIds,
      periodYear: range.year,
      periodMonth: range.month
    }),
    fetchAttendanceForAllMembers(memberIds, range.periodStart, range.periodEnd)
  ])

  const entries: PayrollEntry[] = []
  const missingKpiMemberIds: string[] = []

  for (const compensation of compensationRows) {
    const kpi = kpiData.snapshots.get(compensation.memberId) || null

    if (!kpi) {
      missingKpiMemberIds.push(compensation.memberId)
    }

    const attendance = attendanceData.get(compensation.memberId) ?? null

    const entry = buildPayrollEntry({
      periodId,
      compensation,
      ufValue: period.ufValue,
      bonusConfig,
      kpi,
      attendance
    })

    await upsertPayrollEntry(entry)
    entries.push(entry)
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
          calculated_by = @actorIdentifier
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
    missingKpiMemberIds,
    missingCompensationMemberIds
  }
}
