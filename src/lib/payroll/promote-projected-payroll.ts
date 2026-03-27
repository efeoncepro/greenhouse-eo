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

export type InputDriftWarning = {
  field: string
  message: string
}

export type PromoteProjectedPayrollResult = {
  promotion: ProjectedPayrollPromotionRecord
  calculation: PayrollCalculationResult
  createdPeriod: boolean
  driftWarnings: InputDriftWarning[]
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

    // Detect input drift between projected snapshot and official calculation
    const driftWarnings: InputDriftWarning[] = []
    const projectedByMember = new Map(projection.entries.map(e => [e.memberId, e]))

    for (const officialEntry of calculation.entries) {
      const projected = projectedByMember.get(officialEntry.memberId)

      if (!projected) {
        driftWarnings.push({ field: 'members', message: `${officialEntry.memberName}: presente en oficial pero no en proyección` })
        continue
      }

      if (projected.kpiOtdPercent != null && officialEntry.kpiOtdPercent != null && projected.kpiOtdPercent !== officialEntry.kpiOtdPercent) {
        driftWarnings.push({ field: 'kpi_otd', message: `${officialEntry.memberName}: OTD cambió de ${projected.kpiOtdPercent}% a ${officialEntry.kpiOtdPercent}%` })
      }

      if (projected.kpiRpaAvg != null && officialEntry.kpiRpaAvg != null && projected.kpiRpaAvg !== officialEntry.kpiRpaAvg) {
        driftWarnings.push({ field: 'kpi_rpa', message: `${officialEntry.memberName}: RpA cambió de ${projected.kpiRpaAvg} a ${officialEntry.kpiRpaAvg}` })
      }

      if (projected.daysPresent != null && officialEntry.daysPresent != null && projected.daysPresent !== officialEntry.daysPresent) {
        driftWarnings.push({ field: 'attendance', message: `${officialEntry.memberName}: días presentes cambió de ${projected.daysPresent} a ${officialEntry.daysPresent}` })
      }

      if (projected.chileUfValue != null && officialEntry.chileUfValue != null && projected.chileUfValue !== officialEntry.chileUfValue) {
        driftWarnings.push({ field: 'uf_value', message: `${officialEntry.memberName}: UF cambió de ${projected.chileUfValue} a ${officialEntry.chileUfValue}` })
      }
    }

    for (const projectedEntry of projection.entries) {
      if (!calculation.entries.some(e => e.memberId === projectedEntry.memberId)) {
        driftWarnings.push({ field: 'members', message: `${projectedEntry.memberName}: presente en proyección pero no en oficial` })
      }
    }

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
      createdPeriod: officialPeriod.created,
      driftWarnings
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
