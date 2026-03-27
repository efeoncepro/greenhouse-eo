import 'server-only'

import type {
  PayrollCalculationResult,
  PeriodStatus,
  PromoteProjectedPayrollInput,
  ProjectedPayrollPromotionRecord
} from '@/types/payroll'

import { PayrollValidationError, buildPeriodId } from '@/lib/payroll/shared'
import { createPayrollPeriod, getPayrollPeriod } from '@/lib/payroll/get-payroll-periods'
import { calculatePayroll } from '@/lib/payroll/calculate-payroll'
import { projectPayrollForPeriod } from '@/lib/payroll/project-payroll'
import { upsertProjectedPayrollSnapshot } from '@/lib/payroll/projected-payroll-store'
import {
  pgCreateProjectedPayrollPromotion,
  pgMarkProjectedPayrollPromotionCompleted,
  pgMarkProjectedPayrollPromotionFailed,
  publishProjectedPayrollPromotionEvents
} from '@/lib/payroll/projected-payroll-promotion-store'
import { isPayrollPostgresEnabled } from '@/lib/payroll/postgres-store'

export type PromoteProjectedPayrollResult = {
  promotion: ProjectedPayrollPromotionRecord
  calculation: PayrollCalculationResult
  createdPeriod: boolean
}

const getUserIdFromActorIdentifier = (actorIdentifier: string | null) => {
  if (!actorIdentifier) {
    return null
  }

  return actorIdentifier.startsWith('user_') ? actorIdentifier : null
}

const ensureOfficialPeriod = async ({
  year,
  month
}: {
  year: number
  month: number
}): Promise<{ periodId: string; created: boolean; status: PeriodStatus | null }> => {
  const periodId = buildPeriodId(year, month)
  const existing = await getPayrollPeriod(periodId)

  if (existing) {
    return { periodId, created: false, status: existing.status }
  }

  const created = await createPayrollPeriod({ year, month })

  return { periodId: created.periodId, created: true, status: null }
}

export const promoteProjectedPayrollToOfficialDraft = async (
  input: PromoteProjectedPayrollInput
): Promise<PromoteProjectedPayrollResult> => {
  if (!isPayrollPostgresEnabled()) {
    throw new PayrollValidationError(
      'Projected payroll promotion currently requires PostgreSQL runtime.',
      503
    )
  }

  const { year, month, mode, actorIdentifier } = input
  const officialPeriod = await ensureOfficialPeriod({ year, month })
  const projection = await projectPayrollForPeriod({ year, month, mode })

  if (projection.entries.length === 0) {
    throw new PayrollValidationError(
      'No projected payroll entries were produced for this period.',
      400
    )
  }

  for (const entry of projection.entries) {
    await upsertProjectedPayrollSnapshot(entry, projection.period)
  }

  const promotion = await pgCreateProjectedPayrollPromotion({
    periodId: officialPeriod.periodId,
    periodYear: year,
    periodMonth: month,
    projectionMode: mode,
    asOfDate: projection.asOfDate,
    sourceSnapshotCount: projection.entries.length,
    sourcePeriodStatus: officialPeriod.status,
    actorUserId: getUserIdFromActorIdentifier(actorIdentifier),
    actorIdentifier
  })

  try {
    const calculation = await calculatePayroll({
      periodId: officialPeriod.periodId,
      actorIdentifier,
      projectionContext: {
        mode,
        asOfDate: projection.asOfDate,
        promotionId: promotion.promotionId
      }
    })

    const completedPromotion = await pgMarkProjectedPayrollPromotionCompleted({
      promotionId: promotion.promotionId,
      promotedEntryCount: calculation.entries.length
    })

    const resolvedPromotion = completedPromotion ?? promotion

    await publishProjectedPayrollPromotionEvents({
      promotion: resolvedPromotion,
      periodId: officialPeriod.periodId,
      periodStatus: calculation.period.status,
      promotedEntryCount: calculation.entries.length
    })

    return {
      promotion: resolvedPromotion,
      calculation,
      createdPeriod: officialPeriod.created
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown payroll promotion failure'

    try {
      await pgMarkProjectedPayrollPromotionFailed({
        promotionId: promotion.promotionId,
        failureReason: message
      })
    } catch {
      // Ignore secondary persistence failures so the original payroll error survives.
    }

    throw error
  }
}
