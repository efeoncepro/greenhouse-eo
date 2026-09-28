import 'server-only'

/**
 * TASK-1921 — eventos de outbox del render de piezas de marca. Payloads redactados: ids, familia, catálogo, hash,
 * estado, intentos y asset ids. Nunca el intent, el plan, los nombres de las fuentes, bytes ni URLs.
 */

import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import type { BrandRenderActorKind, BrandRenderCatalogName, BrandRenderFamily } from './contracts'

type OutboxClient = Parameters<typeof publishOutboxEvent>[1]

export type BrandRenderRequestedPayload = {
  version: 1
  requestId: string
  organizationId: string
  family: BrandRenderFamily
  jobs: { jobId: string; catalogName: BrandRenderCatalogName; manifestHash: string }[]
  actorKind: BrandRenderActorKind
}

export type BrandRenderJobPayload = {
  version: 1
  requestId: string
  jobId: string
  organizationId: string
  catalogName: BrandRenderCatalogName
  state: string
  attempts: number
  failureCode: string | null
  /** Sólo en completed: los assets privados producidos (ids, nunca bytes ni URL). */
  outputAssetIds: string[]
}

export const publishBrandRenderRequested = (client: OutboxClient, payload: BrandRenderRequestedPayload) =>
  publishOutboxEvent(
    { aggregateType: AGGREGATE_TYPES.brandRenderRequest, aggregateId: payload.requestId, eventType: EVENT_TYPES.brandRenderRequested, payload },
    client
  )

export const publishBrandRenderJobCompleted = (client: OutboxClient, payload: BrandRenderJobPayload) =>
  publishOutboxEvent(
    { aggregateType: AGGREGATE_TYPES.brandRenderRequest, aggregateId: payload.requestId, eventType: EVENT_TYPES.brandRenderJobCompleted, payload },
    client
  )

export const publishBrandRenderJobFailed = (client: OutboxClient, payload: BrandRenderJobPayload) =>
  publishOutboxEvent(
    { aggregateType: AGGREGATE_TYPES.brandRenderRequest, aggregateId: payload.requestId, eventType: EVENT_TYPES.brandRenderJobFailed, payload },
    client
  )
