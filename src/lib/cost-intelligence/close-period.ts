import 'server-only'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

import { checkPeriodReadiness, materializePeriodClosureStatus } from './check-period-readiness'
import { assertValidPeriodParts, CostIntelligenceValidationError } from './shared'

export const closePeriod = async ({
  year,
  month,
  actor,
  actorUserId
}: {
  year: number
  month: number
  actor?: string
  actorUserId?: string
}) => {
  assertValidPeriodParts(year, month)
  const effectiveActor = (actorUserId ?? actor ?? '').trim()

  if (!effectiveActor) {
    throw new CostIntelligenceValidationError('actorUserId is required.', 400)
  }

  return withGreenhousePostgresTransaction(async client => {
    const current = await checkPeriodReadiness({ year, month, client })

    if (current.closureStatus === 'closed') {
      return {
        period: current,
        alreadyClosed: true,
        closedNow: false,
        eventId: null
      }
    }

    if (!current.isReady) {
      throw new CostIntelligenceValidationError('Period is not ready to close.', 409, {
        readinessPct: current.readinessPct,
        payrollStatus: current.payrollStatus,
        incomeStatus: current.incomeStatus,
        expenseStatus: current.expenseStatus,
        fxStatus: current.fxStatus
      })
    }

    const closedAt = new Date().toISOString()

    const period = await materializePeriodClosureStatus({
      year,
      month,
      client,
      override: {
        closureStatus: 'closed',
        snapshotRevision: current.snapshotRevision,
        closedAt,
        closedBy: effectiveActor,
        reopenedAt: null,
        reopenedBy: null,
        reopenedReason: null
      }
    })

    const eventId = await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.periodClosure,
        aggregateId: period.periodId,
        eventType: EVENT_TYPES.accountingPeriodClosed,
        payload: {
          periodId: period.periodId,
          periodYear: year,
          periodMonth: month,
          closureStatus: 'closed',
          snapshotRevision: period.snapshotRevision,
          payrollClosed: period.payrollClosed,
          incomeClosed: period.incomeClosed,
          expensesClosed: period.expensesClosed,
          reconciliationClosed: period.reconciliationClosed,
          fxLocked: period.fxLocked,
          closedBy: effectiveActor
        }
      },
      client
    )

    return {
      period,
      alreadyClosed: false,
      closedNow: true,
      eventId
    }
  })
}

export { reopenPeriod } from './reopen-period'
