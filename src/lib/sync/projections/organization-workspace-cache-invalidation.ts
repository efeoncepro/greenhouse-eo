import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { clearProjectionCacheForSubject } from '@/lib/organization-workspace/cache'

/**
 * TASK-611 Slice 6 — Reactive cache invalidation consumer for the Organization
 * Workspace projection.
 *
 * Cuando un grant/revoke/role-change/user-deactivation se publica al outbox,
 * el cache in-memory del projection helper (TTL 30s natural) podría servir
 * resultados stale durante esa ventana. Este consumer drops el cache scoped
 * al subject afectado dentro de pocos segundos.
 *
 * Triggers canónicos (5, decididos en Delta 2026-05-08 V1.1 — los events
 * `identity.entitlement.granted/revoked` v1 del spec original NO existen):
 *
 *   - access.entitlement_role_default_changed   (TASK-404 admin governance)
 *   - access.entitlement_user_override_changed  (TASK-404 admin governance)
 *   - role.assigned                              (TASK-247 governance)
 *   - role.revoked                               (TASK-247 governance)
 *   - user.deactivated                           (TASK-253 user lifecycle)
 *
 * Idempotente: re-ejecutar el consumer sobre el mismo evento drops el cache
 * (que podría estar vacío) sin efectos secundarios — es operación pure-clear.
 *
 * Patrón fuente: notifications.ts projection (consumer reactivo simple, sin
 * proyección DB — solo side-effect controlado).
 */

const TRIGGER_EVENTS = [
  'access.entitlement_role_default_changed',
  'access.entitlement_user_override_changed',
  'role.assigned',
  'role.revoked',
  'user.deactivated'
] as const

const extractSubjectUserId = (payload: Record<string, unknown>): string | null => {
  // Common payload shapes across the 5 triggers:
  //   role.assigned/revoked            → { userId } or { user_id, role_code, ... }
  //   user.deactivated                 → { userId, ... }
  //   access.entitlement_*_changed     → { userId } o { targetUserId } (TASK-404 emisión)
  // Try a small set of well-known keys before giving up.
  const candidates = ['userId', 'subjectUserId', 'targetUserId', 'user_id', 'subject_id']

  for (const key of candidates) {
    const value = payload[key]

    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return null
}

const extractAffectedUserIds = (payload: Record<string, unknown>): string[] => {
  const value = payload.affectedUserIds

  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === 'string')
        .map(entry => entry.trim())
        .filter(Boolean)
    )
  )
}

export const organizationWorkspaceCacheInvalidationProjection: ProjectionDefinition = {
  name: 'organization_workspace_cache_invalidation',
  description:
    'TASK-611 Slice 6 — drops el cache in-memory del Organization Workspace projection scoped a un subject cuando emergen events que invalidan su capability bag.',
  domain: 'organization',
  triggerEvents: [...TRIGGER_EVENTS],

  extractScope: payload => {
    const userId = extractSubjectUserId(payload)

    if (!userId) return null

    return { entityType: 'workspace_projection_cache', entityId: userId }
  },

  extractScopes: payload => {
    const userId = extractSubjectUserId(payload)

    if (userId) {
      return [{ entityType: 'workspace_projection_cache', entityId: userId }]
    }

    return extractAffectedUserIds(payload).map(entityId => ({
      entityType: 'workspace_projection_cache',
      entityId
    }))
  },

  refresh: async scope => {
    const cleared = clearProjectionCacheForSubject(scope.entityId)

    return `cleared ${cleared} workspace projection cache entries for subject ${scope.entityId}`
  },

  // Cache invalidation is best-effort (TTL 30s natural fallback); 1 retry max.
  maxRetries: 1
}
