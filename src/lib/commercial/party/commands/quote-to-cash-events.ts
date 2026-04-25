import 'server-only'

import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import type {
  CommercialOperationStatus,
  ConversionTriggeredBy
} from './convert-quote-to-cash-types'

// TASK-541: publishers for the quote-to-cash choreography itself. They use
// a dedicated aggregate `commercial_operation` so the audit narrative lives
// under a single aggregate_id (the operation_id) rather than scattering
// across quotation/contract/deal aggregates. The per-step events
// (`commercial.quotation.converted`, `commercial.contract.created`,
// `commercial.party.promoted`, etc.) continue to be emitted by their own
// publishers with the same `correlationId` in the payload so consumers can
// reconstruct the cross-aggregate chain.

type PublishClient = Parameters<typeof publishOutboxEvent>[1]

interface BaseQuoteToCashPayload {
  operationId: string
  correlationId: string
  quotationId: string
  organizationId: string | null
  hubspotDealId: string | null
  triggerSource: ConversionTriggeredBy
  actorUserId: string
  totalAmountClp: number | null
}

export interface QuoteToCashStartedPayload extends BaseQuoteToCashPayload {
  startedAt: string
}

export interface QuoteToCashCompletedPayload extends BaseQuoteToCashPayload {
  contractId: string
  clientId: string
  organizationPromoted: boolean
  clientInstantiated: boolean
  dealWonEmitted: boolean
  completedAt: string
}

export interface QuoteToCashFailedPayload extends BaseQuoteToCashPayload {
  errorCode: string
  errorMessage: string
  failedAt: string
}

export interface QuoteToCashApprovalRequestedPayload extends BaseQuoteToCashPayload {
  approvalId: string
  thresholdClp: number
  requestedAt: string
}

const publishQuoteToCashEvent = async <T extends BaseQuoteToCashPayload>(
  eventType: string,
  payload: T,
  client?: PublishClient
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.commercialOperation,
      aggregateId: payload.operationId,
      eventType,
      payload: { ...payload } as Record<string, unknown>
    },
    client
  )

export const publishQuoteToCashStarted = async (
  payload: QuoteToCashStartedPayload,
  client?: PublishClient
) => publishQuoteToCashEvent(EVENT_TYPES.quoteToCashStarted, payload, client)

export const publishQuoteToCashCompleted = async (
  payload: QuoteToCashCompletedPayload,
  client?: PublishClient
) => publishQuoteToCashEvent(EVENT_TYPES.quoteToCashCompleted, payload, client)

export const publishQuoteToCashFailed = async (
  payload: QuoteToCashFailedPayload,
  client?: PublishClient
) => publishQuoteToCashEvent(EVENT_TYPES.quoteToCashFailed, payload, client)

export const publishQuoteToCashApprovalRequested = async (
  payload: QuoteToCashApprovalRequestedPayload,
  client?: PublishClient
) => publishQuoteToCashEvent(EVENT_TYPES.quoteToCashApprovalRequested, payload, client)

export type { CommercialOperationStatus }
