import 'server-only'

import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { CurrentSourceRole } from '@/lib/finance/pricing-v3/adapters/current-versions'

import type { QuoterDbClient } from './db'
import type { QuoterActorKind } from './types'

/**
 * Outbox events v1 of the quoter registry (TASK-2025). Published INSIDE the transaction that wrote the row, with
 * the same client. Payloads carry role, version, digests and origin: never the text of a document or of a pointer,
 * which hold internal costs and margins.
 *
 * The events of a quote (created, version registered, issued, withdrawn) are born with the commands of TASK-2027.
 */
export type QuoterSourceDocumentStoredPayload = {
  version: 1
  role: CurrentSourceRole
  documentVersion: string
  documentDigest: string
  origin: 'repo_import' | 'artifact_embedded' | 'platform_apply'
  actorKind: QuoterActorKind
}

export type QuoterPointerActivatedPayload = {
  version: 1
  pointerSeq: number
  pointerDigest: string
  previousPointerDigest: string | null
  catalogDigest: string
  policyDigest: string
  creditsDigest: string
  origin: 'repo_mirror' | 'platform_activation'
}

export const publishQuoterSourceDocumentStored = (client: QuoterDbClient, payload: QuoterSourceDocumentStoredPayload) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quoterSourceDocument,
      aggregateId: `${payload.role}:${payload.documentDigest}`,
      eventType: EVENT_TYPES.quoterSourceDocumentStored,
      payload
    },
    client
  )

export const publishQuoterPointerActivated = (client: QuoterDbClient, payload: QuoterPointerActivatedPayload) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.quoterPointer,
      aggregateId: payload.pointerDigest,
      eventType: EVENT_TYPES.quoterPointerActivated,
      payload
    },
    client
  )
