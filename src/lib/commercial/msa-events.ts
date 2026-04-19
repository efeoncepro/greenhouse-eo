import 'server-only'

import type { Kysely, Transaction } from 'kysely'

import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type { DB } from '@/types/db'

type PublisherClient = Kysely<DB> | Transaction<DB> | { query: (text: string, values?: unknown[]) => Promise<unknown> }

interface MasterAgreementEventPayload {
  msaId: string
  msaNumber: string
  organizationId: string
  clientId?: string | null
  status?: string | null
  contractId?: string | null
  clauseCount?: number | null
  actorUserId?: string | null
}

const publishMasterAgreementEvent = async (
  eventType: string,
  payload: MasterAgreementEventPayload,
  client?: PublisherClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.masterAgreement,
      aggregateId: payload.msaId,
      eventType,
      payload: { ...payload } as Record<string, unknown>
    },
    client
  )

export const publishMasterAgreementCreated = async (
  payload: MasterAgreementEventPayload,
  client?: PublisherClient
) => publishMasterAgreementEvent(EVENT_TYPES.masterAgreementCreated, payload, client)

export const publishMasterAgreementUpdated = async (
  payload: MasterAgreementEventPayload,
  client?: PublisherClient
) => publishMasterAgreementEvent(EVENT_TYPES.masterAgreementUpdated, payload, client)

export const publishMasterAgreementClausesChanged = async (
  payload: MasterAgreementEventPayload,
  client?: PublisherClient
) => publishMasterAgreementEvent(EVENT_TYPES.masterAgreementClausesChanged, payload, client)

export const publishContractMsaLinked = async (
  payload: MasterAgreementEventPayload,
  client?: PublisherClient
) => publishMasterAgreementEvent(EVENT_TYPES.contractMsaLinked, payload, client)
