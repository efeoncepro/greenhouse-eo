import 'server-only'

import { clearProjectionCacheForService } from '@/lib/commercial/sample-sprints/projection-cache'

import type { ProjectionDefinition } from '../projection-registry'

/**
 * TASK-835 — Reactive cache invalidation para Sample Sprints Runtime Projection.
 *
 * Pattern fuente: `organization-workspace-cache-invalidation.ts` (TASK-611).
 *
 * Escucha los 6 outbox events que pueden modificar el shape del sprint
 * (declaración, decisión de aprobación, registro de progreso, registro de
 * outcome) y droppea el cache scoped al `service_id` afectado para que el
 * próximo render de `/agency/sample-sprints` lea datos frescos en lugar de
 * esperar el TTL natural de 30s.
 *
 * Sin esta invalidación, el operador podría ver datos stale 30s después de
 * aprobar/recordar progreso/cerrar outcome — inaceptable para UX comercial.
 *
 * El extractor busca `service_id` o `serviceId` en el payload. Si no aparece,
 * la projection skipea (idempotente, cero side effects beyond cache drop).
 */

const TRIGGER_EVENTS = [
  'service.engagement.declared',
  'service.engagement.approved',
  'service.engagement.rejected',
  'service.engagement.capacity_overridden',
  'service.engagement.progress_snapshot_recorded',
  'service.engagement.outcome_recorded'
] as const

const SCOPE_KEYS = ['serviceId', 'service_id', 'aggregateId', 'aggregate_id'] as const

const extractServiceId = (payload: Record<string, unknown>): string | null => {
  for (const key of SCOPE_KEYS) {
    const value = payload[key]

    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }

  return null
}

export const sampleSprintRuntimeCacheInvalidationProjection: ProjectionDefinition = {
  name: 'sample-sprint-runtime-cache-invalidation',
  description:
    'Drop in-memory Sample Sprints Runtime Projection cache when a service.engagement.* outbox event fires (TASK-835).',
  domain: 'organization',
  triggerEvents: [...TRIGGER_EVENTS],
  extractScope: payload => {
    const serviceId = extractServiceId(payload)

    if (!serviceId) return null

    return { entityType: 'sample_sprint_runtime', entityId: serviceId }
  },
  refresh: async scope => {
    const cleared = clearProjectionCacheForService(scope.entityId)

    return `cleared ${cleared} sample sprint runtime projection cache entries for service ${scope.entityId}`
  },
  maxRetries: 1
}
