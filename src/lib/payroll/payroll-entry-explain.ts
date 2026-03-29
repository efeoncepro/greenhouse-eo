import type { CompensationVersion, PayrollEntry, PayrollEntryExplain, PayrollPeriod } from '@/types/payroll'

import { getCompensationVersionById } from '@/lib/payroll/get-compensation'
import { getPayrollEntryById } from '@/lib/payroll/get-payroll-entries'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { PayrollValidationError } from '@/lib/payroll/shared'

const roundFactor = (value: number) => Math.round(value * 10000) / 10000

export const buildPayrollEntryExplain = ({
  entry,
  period,
  compensationVersion
}: {
  entry: PayrollEntry
  period: PayrollPeriod
  compensationVersion: CompensationVersion | null
}): PayrollEntryExplain => {
  const deductibleDays = (entry.daysAbsent ?? 0) + (entry.daysOnUnpaidLeave ?? 0)

  const attendanceRatio =
    typeof entry.workingDaysInPeriod === 'number' && entry.workingDaysInPeriod > 0
      ? roundFactor(Math.max(0, (entry.workingDaysInPeriod - deductibleDays) / entry.workingDaysInPeriod))
      : null

  const effectiveBaseSalary = entry.adjustedBaseSalary ?? entry.baseSalary
  const effectiveRemoteAllowance = entry.adjustedRemoteAllowance ?? entry.remoteAllowance
  const effectiveFixedBonusAmount = entry.adjustedFixedBonusAmount ?? entry.fixedBonusAmount
  const warnings: string[] = []

  if (entry.kpiDataSource === 'ico') {
    warnings.push('El snapshot actual conserva la fuente ICO, pero no si el KPI vino materializado o live.')
  }

  if (entry.manualOverride) {
    warnings.push('La entry tiene override manual de neto activo.')
  }

  if (entry.kpiDataSource === 'manual') {
    warnings.push('La entry usa KPI manual.')
  }

  return {
    entry,
    period,
    compensationVersion,
    calculation: {
      deductibleDays,
      attendanceRatio,
      effectiveBaseSalary,
      effectiveRemoteAllowance,
      effectiveFixedBonusAmount,
      totalVariableBonus: entry.bonusOtdAmount + entry.bonusRpaAmount + entry.bonusOtherAmount,
      hasAttendanceAdjustment:
        entry.adjustedBaseSalary != null
        || entry.adjustedRemoteAllowance != null
        || entry.adjustedFixedBonusAmount != null,
      usesManualKpi: entry.kpiDataSource === 'manual',
      usesManualOverride: entry.manualOverride,
      kpiSourceModeAvailable: entry.kpiDataSource === 'manual',
      warnings
    }
  }
}

export const getPayrollEntryExplain = async (entryId: string): Promise<PayrollEntryExplain> => {
  const entry = await getPayrollEntryById(entryId)

  if (!entry) {
    throw new PayrollValidationError('Payroll entry not found.', 404)
  }

  const [period, compensationVersion] = await Promise.all([
    getPayrollPeriod(entry.periodId),
    getCompensationVersionById(entry.compensationVersionId)
  ])

  if (!period) {
    throw new PayrollValidationError('Payroll period not found for payroll entry.', 500)
  }

  return buildPayrollEntryExplain({
    entry,
    period,
    compensationVersion
  })
}
