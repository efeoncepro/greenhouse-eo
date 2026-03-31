import 'server-only'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

import { checkPeriodReadiness, materializePeriodClosureStatus } from './check-period-readiness'
import { assertValidPeriodParts, CostIntelligenceValidationError } from './shared'

export const reopenPeriod = async ({
  year,
  month,
  actor,
  actorUserId,
  reason
}: {
  year: number
  month: number
  actor?: string
  actorUserId?: string
  reason: string
}) => {
  assertValidPeriodParts(year, month)
  const effectiveActor = (actorUserId ?? actor ?? '').trim()

  const normalizedReason = reason.trim()

  if (!effectiveActor) {
    throw new CostIntelligenceValidationError('actorUserId is required.', 400)
  }

  if (!normalizedReason) {
    throw new CostIntelligenceValidationError('reason is required to reopen a period.', 400)
  }

  return withGreenhousePostgresTransaction(async client => {
    const current = await checkPeriodReadiness({ year, month, client })

    if (current.closureStatus !== 'closed') {
      throw new CostIntelligenceValidationError('Only closed periods can be reopened.', 409)
    }

    const reopenedAt = new Date().toISOString()
    const newRevision = current.snapshotRevision + 1

    const period = await materializePeriodClosureStatus({
      year,
      month,
      client,
      override: {
        closureStatus: 'reopened',
        snapshotRevision: newRevision,
        closedAt: current.audit.closedAt,
        closedBy: current.audit.closedBy,
        reopenedAt,
        reopenedBy: effectiveActor,
        reopenedReason: normalizedReason
      }
    })

    const eventId = await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.periodClosure,
        aggregateId: period.periodId,
        eventType: EVENT_TYPES.accountingPeriodReopened,
        payload: {
          periodId: period.periodId,
          periodYear: year,
          periodMonth: month,
          reopenedBy: effectiveActor,
          reason: normalizedReason,
          newRevision
        }
      },
      client
    )

    return {
      period,
      snapshotRevision: period.snapshotRevision,
      reopenedNow: true,
      eventId
    }
  })
}
