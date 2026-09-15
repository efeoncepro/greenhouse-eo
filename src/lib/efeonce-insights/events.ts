/**
 * TASK-1845 — eventos outbox v1 de Efeonce Insights. Se publican DENTRO de la misma
 * transacción que el cambio de estado (`publishOutboxEvent(event, client)`). Payloads
 * redactados: ids, versión, estados, hashes, módulos y ventana; nunca hechos, evidencia,
 * narrativa, prompts ni bearer.
 */

import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import type { InsightActorKind, InsightEditionState } from './contracts/states'

type OutboxClient = Parameters<typeof publishOutboxEvent>[1]

export type InsightReportCreatedPayload = {
  version: 1
  reportId: string
  reportCode: string
  organizationId: string
  actorKind: InsightActorKind
}

export type InsightEditionCreatedPayload = {
  version: 1
  editionId: string
  reportId: string
  organizationId: string
  editionVersion: number
  audience: string
  modules: string[]
  outputs: string[]
  periodStartUtc: string
  periodEndUtc: string
  requestHash: string
  supersedesEditionId: string | null
  actorKind: InsightActorKind
}

export type InsightEditionStateTransitionedPayload = {
  version: 1
  editionId: string
  reportId: string
  organizationId: string
  fromState: InsightEditionState
  toState: InsightEditionState
  requiresHumanGate: boolean
  actorKind: InsightActorKind
  transitionId: string
}

export type InsightEvidenceSealedPayload = {
  version: 1
  snapshotId: string
  editionId: string
  organizationId: string
  snapshotHash: string
  factCount: number
  rejectionCount: number
  asOfMax: string | null
}

export type InsightEditionIssuedPayload = {
  version: 1
  editionId: string
  reportId: string
  organizationId: string
  editionVersion: number
  issuedHash: string
  actorKind: InsightActorKind
}

export const publishInsightReportCreated = (client: OutboxClient, payload: InsightReportCreatedPayload) =>
  publishOutboxEvent(
    { aggregateType: AGGREGATE_TYPES.insightReport, aggregateId: payload.reportId, eventType: EVENT_TYPES.insightReportCreated, payload },
    client
  )

export const publishInsightEditionCreated = (client: OutboxClient, payload: InsightEditionCreatedPayload) =>
  publishOutboxEvent(
    { aggregateType: AGGREGATE_TYPES.insightEdition, aggregateId: payload.editionId, eventType: EVENT_TYPES.insightEditionCreated, payload },
    client
  )

export const publishInsightEditionStateTransitioned = (client: OutboxClient, payload: InsightEditionStateTransitionedPayload) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.insightEdition,
      aggregateId: payload.editionId,
      eventType: EVENT_TYPES.insightEditionStateTransitioned,
      payload
    },
    client
  )

export const publishInsightEvidenceSealed = (client: OutboxClient, payload: InsightEvidenceSealedPayload) =>
  publishOutboxEvent(
    { aggregateType: AGGREGATE_TYPES.insightEdition, aggregateId: payload.editionId, eventType: EVENT_TYPES.insightEvidenceSealed, payload },
    client
  )

export const publishInsightEditionIssued = (client: OutboxClient, payload: InsightEditionIssuedPayload) =>
  publishOutboxEvent(
    { aggregateType: AGGREGATE_TYPES.insightEdition, aggregateId: payload.editionId, eventType: EVENT_TYPES.insightEditionIssued, payload },
    client
  )
