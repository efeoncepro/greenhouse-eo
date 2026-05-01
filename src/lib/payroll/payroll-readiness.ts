import type {
  PayrollApprovalReadiness,
  PayrollCalculationReadiness,
  PayrollPeriod,
  PayrollPeriodReadiness,
  PayrollReadinessIssue
} from '@/types/payroll'

import { getLastBusinessDayOfMonth, getOperationalDateKey } from '@/lib/calendar/operational-calendar'
import { getHistoricalEconomicIndicatorForPeriod } from '@/lib/finance/economic-indicators'
import {
  requiresPayrollAttendanceSignal,
  requiresPayrollChileTaxTable,
  requiresPayrollKpi
} from '@/lib/payroll/compensation-requirements'
import { fetchAttendanceForPayrollPeriod } from '@/lib/payroll/fetch-attendance-for-period'
import { fetchKpisForPeriod } from '@/lib/payroll/fetch-kpis-for-period'
import { getApplicableCompensationVersionsForPeriod } from '@/lib/payroll/get-compensation'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { PayrollValidationError, getPeriodRangeFromId } from '@/lib/payroll/shared'
import { resolvePayrollTaxTableVersion } from '@/lib/payroll/tax-table-version'

type ApplicableCompensation = Awaited<ReturnType<typeof getApplicableCompensationVersionsForPeriod>>[number]
type AttendanceSnapshot =
  Awaited<ReturnType<typeof fetchAttendanceForPayrollPeriod>>['snapshots'] extends Map<string, infer TValue>
    ? TValue
    : never

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

export const buildPayrollPeriodReadiness = ({
  period,
  compensationRows,
  missingKpiMemberIds,
  missingAttendanceMemberIds,
  attendanceDiagnostics,
  missingUtmValue = false,
  referenceDate = new Date()
}: {
  period: PayrollPeriod
  compensationRows: ApplicableCompensation[]
  missingKpiMemberIds: string[]
  missingAttendanceMemberIds: string[]
  attendanceDiagnostics: PayrollPeriodReadiness['attendanceDiagnostics']
  missingUtmValue?: boolean
  referenceDate?: Date | string
}): PayrollPeriodReadiness => {
  const includedCompensations = compensationRows.filter(row => row.hasCompensationVersion)
  const includedMemberIds = includedCompensations.map(row => row.memberId)

  const missingCompensationMemberIds = compensationRows
    .filter(row => !row.hasCompensationVersion)
    .map(row => row.memberId)

  const requiresUfValue = includedCompensations.some(
    row => row.payRegime === 'chile' && row.healthSystem === 'isapre' && (row.healthPlanUf || 0) > 0
  )

  const includesChilePayroll = includedCompensations.some(requiresPayrollChileTaxTable)

  const blockingIssues: PayrollReadinessIssue[] = []
  const warnings: PayrollReadinessIssue[] = []

  if (includedMemberIds.length === 0) {
    blockingIssues.push({
      code: 'no_compensated_members',
      severity: 'blocking',
      message: 'No hay colaboradores activos con compensación vigente para este período.'
    })
  }

  if (requiresUfValue && typeof period.ufValue !== 'number') {
    blockingIssues.push({
      code: 'missing_uf_value',
      severity: 'blocking',
      message: 'Falta el valor UF y este período lo requiere para calcular descuentos Isapre.'
    })
  }

  if (includesChilePayroll && !period.taxTableVersion) {
    blockingIssues.push({
      code: 'missing_tax_table_version',
      severity: 'blocking',
      message:
        'Este período incluye colaboradores Chile y requiere una versión de tabla impositiva para calcular impuesto.'
    })
  }

  if (includesChilePayroll && period.taxTableVersion && missingUtmValue) {
    blockingIssues.push({
      code: 'missing_utm_value',
      severity: 'blocking',
      message: 'No fue posible resolver el valor UTM histórico del período para calcular impuesto Chile.'
    })
  }

  if (missingCompensationMemberIds.length > 0) {
    warnings.push({
      code: 'missing_compensation',
      severity: 'warning',
      message: `${missingCompensationMemberIds.length} colaborador(es) activos quedarían fuera por no tener compensación vigente.`,
      memberIds: missingCompensationMemberIds
    })
  }

  if (attendanceDiagnostics.leaveDataDegraded) {
    blockingIssues.push({
      code: 'leave_data_unavailable',
      severity: 'blocking',
      message:
        'Los datos de permisos (leave_requests) no están disponibles. El cálculo oficial no puede continuar sin esta información.'
    })
  }

  if (missingKpiMemberIds.length > 0) {
    blockingIssues.push({
      code: 'missing_kpi',
      severity: 'blocking',
      message:
        `${missingKpiMemberIds.length} colaborador(es) con bonificación variable requieren KPI ICO antes de calcular este período.`,
      memberIds: missingKpiMemberIds
    })
  }

  if (missingAttendanceMemberIds.length > 0) {
    blockingIssues.push({
      code: 'missing_attendance_signal',
      severity: 'blocking',
      message:
        `${missingAttendanceMemberIds.length} colaborador(es) requieren señales de asistencia o licencias antes de calcular este período.`,
      memberIds: missingAttendanceMemberIds
    })
  }

  const lastBusinessDay = getLastBusinessDayOfMonth(period.year, period.month)
  const referenceDateKey = getOperationalDateKey(referenceDate)

  const calculatedOnTime = period.calculatedAt ? getOperationalDateKey(period.calculatedAt) <= lastBusinessDay : null

  const calculation: PayrollCalculationReadiness = {
    ready: blockingIssues.length === 0,
    blockingIssues,
    warnings,
    deadline: {
      lastBusinessDay,
      isDue: referenceDateKey === lastBusinessDay,
      isOverdue: referenceDateKey > lastBusinessDay && period.status === 'draft',
      calculatedOnTime
    }
  }

  const approval: PayrollApprovalReadiness = {
    ready: blockingIssues.length === 0,
    blockingIssues
  }

  return {
    periodId: period.periodId,
    ready: calculation.ready,
    includedMemberIds,
    missingCompensationMemberIds,
    missingKpiMemberIds,
    missingAttendanceMemberIds,
    requiresUfValue,
    attendanceDiagnostics,
    warnings,
    blockingIssues,
    calculation,
    approval
  }
}

export const getPayrollPeriodReadiness = async (periodId: string): Promise<PayrollPeriodReadiness> => {
  const period = await getPayrollPeriod(periodId)

  if (!period) {
    throw new PayrollValidationError('Payroll period not found.', 404)
  }

  const range = getPeriodRangeFromId(periodId)

  const resolvedUfValue =
    typeof period.ufValue === 'number'
      ? period.ufValue
      : ((
          await getHistoricalEconomicIndicatorForPeriod({
            indicatorCode: 'UF',
            periodDate: range.periodEnd
          })
        )?.value ?? null)

  const compensationRows = await getApplicableCompensationVersionsForPeriod(range.periodStart, range.periodEnd)
  const includedCompensations = compensationRows.filter(row => row.hasCompensationVersion)
  const includesChilePayroll = includedCompensations.some(requiresPayrollChileTaxTable)

  const resolvedTaxTableVersion = includesChilePayroll
    ? await resolvePayrollTaxTableVersion({
        year: period.year,
        month: period.month,
        requestedVersion: period.taxTableVersion,
        allowMonthFallbackForRequestedVersion: true
      })
    : null

  const resolvedUtmValue =
    includesChilePayroll && resolvedTaxTableVersion
      ? ((
          await getHistoricalEconomicIndicatorForPeriod({
            indicatorCode: 'UTM',
            periodDate: range.periodEnd
          })
        )?.value ?? null)
      : null

  const kpiRequiredMemberIds = includedCompensations.filter(requiresPayrollKpi).map(row => row.memberId)

  const attendanceRequiredMemberIds = includedCompensations
    .filter(requiresPayrollAttendanceSignal)
    .map(row => row.memberId)

  const [kpiData, attendanceResult] = await Promise.all([
    fetchKpisForPeriod({
      memberIds: kpiRequiredMemberIds,
      periodYear: range.year,
      periodMonth: range.month
    }),
    fetchAttendanceForPayrollPeriod(attendanceRequiredMemberIds, range.periodStart, range.periodEnd)
  ])

  const attendanceData = attendanceResult.snapshots

  const missingKpiMemberIds = kpiRequiredMemberIds.filter(memberId => !kpiData.snapshots.has(memberId))

  const missingAttendanceMemberIds = attendanceRequiredMemberIds.filter(
    memberId => !hasAttendanceSignal(attendanceData.get(memberId))
  )

  return buildPayrollPeriodReadiness({
    period:
      resolvedUfValue == null && resolvedTaxTableVersion === period.taxTableVersion
        ? period
        : { ...period, ufValue: resolvedUfValue ?? period.ufValue, taxTableVersion: resolvedTaxTableVersion },
    compensationRows,
    missingKpiMemberIds,
    missingAttendanceMemberIds,
    attendanceDiagnostics: attendanceResult.diagnostics,
    missingUtmValue: includesChilePayroll && resolvedTaxTableVersion != null && typeof resolvedUtmValue !== 'number'
  })
}
