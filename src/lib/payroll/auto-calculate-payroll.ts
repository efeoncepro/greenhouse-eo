import 'server-only'

import { getOperationalPayrollMonth, isLastBusinessDayOfMonth, type OperationalCalendarContextInput } from '@/lib/calendar/operational-calendar'
import { calculatePayroll } from '@/lib/payroll/calculate-payroll'
import { createPayrollPeriod, getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { getPayrollPeriodReadiness } from '@/lib/payroll/payroll-readiness'
import { buildPeriodId } from '@/lib/payroll/shared'

export interface PayrollAutoCalculationResult {
  status: 'skipped_not_due' | 'blocked' | 'already_resolved' | 'calculated'
  periodId: string
  createdPeriod: boolean
  calculationTriggered: boolean
  reason: string
  blockingIssues?: ReturnType<typeof getPayrollPeriodReadiness> extends Promise<infer T>
    ? T extends { calculation: { blockingIssues: infer U } }
      ? U
      : never
    : never
}

export const runPayrollAutoCalculation = async ({
  referenceDate = new Date(),
  actorIdentifier = 'system:cron/payroll-auto-calculate',
  calendarOptions
}: {
  referenceDate?: Date | string
  actorIdentifier?: string | null
  calendarOptions?: OperationalCalendarContextInput | null
} = {}): Promise<PayrollAutoCalculationResult> => {
  const resolution = getOperationalPayrollMonth(referenceDate, calendarOptions)
  const periodId = buildPeriodId(resolution.calendarYear, resolution.calendarMonth)

  if (!isLastBusinessDayOfMonth(referenceDate, calendarOptions)) {
    return {
      status: 'skipped_not_due',
      periodId,
      createdPeriod: false,
      calculationTriggered: false,
      reason: 'today_is_not_last_business_day'
    }
  }

  let period = await getPayrollPeriod(periodId)
  let createdPeriod = false

  if (!period) {
    period = await createPayrollPeriod({
      year: resolution.calendarYear,
      month: resolution.calendarMonth
    })
    createdPeriod = true
  }

  if (period.status === 'calculated' || period.status === 'approved' || period.status === 'exported') {
    return {
      status: 'already_resolved',
      periodId: period.periodId,
      createdPeriod,
      calculationTriggered: false,
      reason: `period_already_${period.status}`
    }
  }

  const readiness = await getPayrollPeriodReadiness(period.periodId)

  if (!readiness.calculation.ready) {
    return {
      status: 'blocked',
      periodId: period.periodId,
      createdPeriod,
      calculationTriggered: false,
      reason: 'calculation_blocked',
      blockingIssues: readiness.calculation.blockingIssues
    }
  }

  await calculatePayroll({
    periodId: period.periodId,
    actorIdentifier
  })

  return {
    status: 'calculated',
    periodId: period.periodId,
    createdPeriod,
    calculationTriggered: true,
    reason: 'period_calculated'
  }
}
