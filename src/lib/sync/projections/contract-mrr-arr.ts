import 'server-only'

/**
 * TASK-462 — Contract MRR / ARR reactive projection.
 *
 * Listens to the commercial contract lifecycle events and refreshes
 * the MRR/ARR snapshot for the current operating period. The
 * projection is scoped to `finance_period` (YYYY-MM) so it
 * piggy-backs on the existing reactive-consumer period plumbing.
 */

import { buildMrrArrSnapshotsForPeriod } from '@/lib/commercial-intelligence/mrr-arr-materializer'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

export const CONTRACT_MRR_ARR_TRIGGER_EVENTS = [
  EVENT_TYPES.contractCreated,
  EVENT_TYPES.contractActivated,
  EVENT_TYPES.contractRenewed,
  EVENT_TYPES.contractModified,
  EVENT_TYPES.contractTerminated,
  EVENT_TYPES.contractCompleted
] as const

const parsePeriodFromPayload = (
  payload: Record<string, unknown>
): { year: number; month: number } | null => {
  const year = typeof payload.periodYear === 'number' ? payload.periodYear : null
  const month = typeof payload.periodMonth === 'number' ? payload.periodMonth : null

  if (year && month && month >= 1 && month <= 12) return { year, month }

  const candidates = [payload.effectiveDate, payload.startDate, payload.activatedAt]

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const match = candidate.match(/^(\d{4})-(\d{2})/)

      if (match) {
        const y = Number(match[1])
        const m = Number(match[2])

        if (Number.isInteger(y) && Number.isInteger(m) && m >= 1 && m <= 12) {
          return { year: y, month: m }
        }
      }
    }
  }

  return null
}

export const extractContractMrrArrScope = (
  payload: Record<string, unknown>
): { entityType: string; entityId: string } | null => {
  const explicit = parsePeriodFromPayload(payload)

  if (explicit) {
    return {
      entityType: 'finance_period',
      entityId: `${explicit.year}-${String(explicit.month).padStart(2, '0')}`
    }
  }

  // Fall back to the current UTC month — the dashboard always shows
  // the live period, so refreshing it on every contract mutation is
  // the correct minimal default.
  const now = new Date()

  
return {
    entityType: 'finance_period',
    entityId: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  }
}

export const contractMrrArrProjection: ProjectionDefinition = {
  name: 'contract_mrr_arr',
  description: 'Materialize MRR/ARR snapshots per period for active retainer contracts',
  domain: 'cost_intelligence',
  triggerEvents: [...CONTRACT_MRR_ARR_TRIGGER_EVENTS],
  extractScope: extractContractMrrArrScope,
  refresh: async scope => {
    const [yearStr, monthStr] = scope.entityId.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return null
    }

    const result = await buildMrrArrSnapshotsForPeriod({ year, month })

    return `materialized contract_mrr_arr: ${result.inserted} contracts for ${scope.entityId}`
  },
  maxRetries: 1
}
