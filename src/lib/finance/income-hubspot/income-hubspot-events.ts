import 'server-only'

import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import type { IncomeHubSpotSyncStatus } from './types'

// TASK-524: typed publishers for the Income → HubSpot Invoice bridge. Events
// share the `income` aggregate with the existing `finance.income.created /
// updated / nubox_synced` so downstream consumers can scope by aggregate id
// (the Greenhouse `income_id`) without having to correlate cross-aggregate.

interface QueryableClient {
  query: (text: string, values?: unknown[]) => Promise<unknown>
}

export interface IncomeHubSpotSyncedPayload {
  incomeId: string
  hubspotInvoiceId: string
  hubspotCompanyId: string | null
  hubspotDealId: string | null
  syncedAt: string
  attemptCount: number
}

export interface IncomeHubSpotSyncFailedPayload {
  incomeId: string
  hubspotInvoiceId: string | null
  status: Extract<IncomeHubSpotSyncStatus, 'failed' | 'endpoint_not_deployed' | 'skipped_no_anchors'>
  errorMessage: string | null
  failedAt: string
  attemptCount: number
}

export interface IncomeHubSpotArtifactAttachedPayload {
  incomeId: string
  hubspotInvoiceId: string
  hubspotArtifactNoteId: string
  attachedAt: string

  /** Which Nubox artifact triggered the attach (`dte`, `pdf`, `xml`). */
  artifactKind: 'dte' | 'pdf' | 'xml' | 'combined'
}

const publishIncomeEvent = async <T extends { incomeId: string }>(
  eventType: string,
  payload: T,
  client?: QueryableClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.income,
      aggregateId: payload.incomeId,
      eventType,
      payload: { ...payload } as Record<string, unknown>
    },
    client
  )

export const publishIncomeHubSpotSynced = async (
  payload: IncomeHubSpotSyncedPayload,
  client?: QueryableClient
) => publishIncomeEvent(EVENT_TYPES.financeIncomeHubspotSynced, payload, client)

export const publishIncomeHubSpotSyncFailed = async (
  payload: IncomeHubSpotSyncFailedPayload,
  client?: QueryableClient
) => publishIncomeEvent(EVENT_TYPES.financeIncomeHubspotSyncFailed, payload, client)

export const publishIncomeHubSpotArtifactAttached = async (
  payload: IncomeHubSpotArtifactAttachedPayload,
  client?: QueryableClient
) => publishIncomeEvent(EVENT_TYPES.financeIncomeHubspotArtifactAttached, payload, client)
