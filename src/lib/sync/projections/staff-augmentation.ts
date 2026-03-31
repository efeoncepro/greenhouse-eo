import 'server-only'

import { materializeStaffAugPlacementSnapshotsForPeriod } from '@/lib/staff-augmentation/snapshots'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

const parsePeriodId = (value: unknown) => {
  if (typeof value !== 'string') return null

  const match = value.match(/^(\d{4})-(\d{2})$/)

  if (!match) return null

  return { year: Number(match[1]), month: Number(match[2]) }
}

const parseDateLike = (value: unknown) => {
  if (typeof value !== 'string') return null

  const match = value.match(/^(\d{4})-(\d{2})-\d{2}/)

  if (!match) return null

  return { year: Number(match[1]), month: Number(match[2]) }
}

const toInteger = (value: unknown) => {
  if (typeof value === 'number' && Number.isInteger(value)) return value

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    return Number.isInteger(parsed) ? parsed : null
  }

  return null
}

export const getStaffAugPlacementPeriodFromPayload = (payload: Record<string, unknown>) => {
  const explicitYear = toInteger(payload.periodYear) ?? toInteger(payload.year)
  const explicitMonth = toInteger(payload.periodMonth) ?? toInteger(payload.month)

  if (explicitYear && explicitMonth && explicitMonth >= 1 && explicitMonth <= 12) {
    return { year: explicitYear, month: explicitMonth }
  }

  return (
    parsePeriodId(payload.periodId) ??
    parsePeriodId(payload.payrollPeriodId) ??
    parseDateLike(payload.contractStartDate) ??
    parseDateLike(payload.contractEndDate) ??
    parseDateLike(payload.updatedAt) ??
    parseDateLike(payload.updated_at) ??
    parseDateLike(payload.documentDate) ??
    parseDateLike(payload.paymentDate) ??
    null
  )
}

export const getStaffAugPlacementScopeFromPayload = (payload: Record<string, unknown>) => {
  const period = getStaffAugPlacementPeriodFromPayload(payload)

  const current = period || (() => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
    const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)

    return {
      year: match ? Number(match[1]) : new Date().getFullYear(),
      month: match ? Number(match[2]) : new Date().getMonth() + 1
    }
  })()

  return {
    entityType: 'finance_period',
    entityId: `${current.year}-${String(current.month).padStart(2, '0')}`
  }
}

export const STAFF_AUG_PLACEMENT_TRIGGER_EVENTS = [
  EVENT_TYPES.staffAugPlacementCreated,
  EVENT_TYPES.staffAugPlacementUpdated,
  EVENT_TYPES.staffAugPlacementStatusChanged,
  EVENT_TYPES.staffAugOnboardingItemUpdated,
  EVENT_TYPES.assignmentUpdated,
  EVENT_TYPES.assignmentRemoved,
  EVENT_TYPES.financeExpenseCreated,
  EVENT_TYPES.financeExpenseUpdated,
  EVENT_TYPES.financeToolingCostUpdated,
  EVENT_TYPES.providerUpserted,
  EVENT_TYPES.providerToolingSnapshotMaterialized,
  EVENT_TYPES.payrollPeriodCalculated,
  EVENT_TYPES.payrollPeriodApproved,
  EVENT_TYPES.payrollPeriodExported,
  EVENT_TYPES.payrollEntryUpserted,
  EVENT_TYPES.compensationVersionCreated,
  EVENT_TYPES.compensationVersionUpdated
] as const

export const staffAugPlacementProjection: ProjectionDefinition = {
  name: 'staff_augmentation_placements',
  description: 'Materialize monthly placement economics snapshots for Staff Augmentation',
  domain: 'finance',
  triggerEvents: [...STAFF_AUG_PLACEMENT_TRIGGER_EVENTS],
  extractScope: getStaffAugPlacementScopeFromPayload,
  refresh: async (scope, payload) => {
    const [yearStr, monthStr] = scope.entityId.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return null
    }

    const eventType = typeof payload._eventType === 'string' ? payload._eventType : 'reactive-refresh'

    const snapshots = await materializeStaffAugPlacementSnapshotsForPeriod(
      year,
      month,
      `reactive-refresh:${eventType}:${scope.entityId}`
    )

    for (const snapshot of snapshots) {
      await publishOutboxEvent({
        aggregateType: AGGREGATE_TYPES.staffAugPlacementSnapshot,
        aggregateId: snapshot.snapshotId,
        eventType: EVENT_TYPES.staffAugPlacementSnapshotMaterialized,
        payload: {
          placementId: snapshot.placementId,
          assignmentId: snapshot.assignmentId,
          clientId: snapshot.clientId,
          memberId: snapshot.memberId,
          providerId: snapshot.providerId,
          periodYear: snapshot.periodYear,
          periodMonth: snapshot.periodMonth,
          periodId: snapshot.periodId,
          projectedRevenueClp: snapshot.projectedRevenueClp,
          payrollEmployerCostClp: snapshot.payrollEmployerCostClp,
          commercialLoadedCostClp: snapshot.commercialLoadedCostClp,
          toolingCostClp: snapshot.toolingCostClp,
          grossMarginProxyClp: snapshot.grossMarginProxyClp,
          grossMarginProxyPct: snapshot.grossMarginProxyPct,
          snapshotStatus: snapshot.snapshotStatus
        }
      })
    }

    return `materialized staff augmentation placement snapshots: ${snapshots.length} placements for ${scope.entityId} via ${eventType}`
  },
  maxRetries: 1
}
