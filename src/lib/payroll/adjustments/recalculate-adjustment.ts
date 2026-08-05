import 'server-only'

import type { PayrollCalculationResult } from '@/types/payroll'

import { calculatePayroll } from '@/lib/payroll/calculate-payroll'
import { getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { isPayrollParticipationWindowEnabled } from '@/lib/payroll/participation-window'
import { recalculatePayrollEntry } from '@/lib/payroll/recalculate-entry'
import { isPayrollPeriodFinalized } from '@/lib/payroll/period-lifecycle'
import { PayrollAdjustmentValidationError } from './apply-adjustment'

export type AdjustmentRecalculationScope = 'entry' | 'period'

export const resolveAdjustmentRecalculationScope = ({
  participationWindowEnabled
}: {
  participationWindowEnabled: boolean
}): AdjustmentRecalculationScope => (participationWindowEnabled ? 'period' : 'entry')

export const assertAdjustmentPeriodWritable = async (periodId: string) => {
  const period = await getPayrollPeriod(periodId)

  if (!period) throw new PayrollAdjustmentValidationError('Payroll period not found.', 404)

  if (isPayrollPeriodFinalized(period.status)) {
    throw new PayrollAdjustmentValidationError(
      'El período está exportado. Reabre la nómina mediante el flujo de reliquidación antes de aplicar ajustes.',
      409,
      { code: 'payroll_period_exported_requires_reopen', periodId }
    )
  }

  return period
}

export const recalculateAfterAdjustment = async ({
  entryId,
  periodId,
  actorIdentifier
}: {
  entryId: string
  periodId: string
  actorIdentifier: string
}): Promise<{ scope: AdjustmentRecalculationScope; periodResult?: PayrollCalculationResult }> => {
  await assertAdjustmentPeriodWritable(periodId)

  const scope = resolveAdjustmentRecalculationScope({
    participationWindowEnabled: isPayrollParticipationWindowEnabled()
  })

  if (scope === 'period') {
    const periodResult = await calculatePayroll({ periodId, actorIdentifier })

    return { scope, periodResult }
  }

  await recalculatePayrollEntry({ entryId, input: {}, actorIdentifier })

  return { scope }
}
