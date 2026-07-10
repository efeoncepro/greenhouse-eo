import 'server-only'

// TASK-356 — Consumer reactivo del HiringHandoff. Nodo N10 del master flow EPIC-011.
//
// Trigger: SOLO `hiring.application.decided` (NUNCA stage_changed — evitaría handoff falso
// en movimientos intermedios). El filtro `decision='selected'` vive en el materializer, que
// lee el snapshot ACTUAL de hiring_application — nunca el representativePayload (hay
// coalescing por scope: N eventos del mismo application colapsan a 1 refresh y el payload
// representativo puede ser una decisión vieja).
//
// SIN flag: un refresh() no-op escribe `coalesced:no-op` en outbox_reactive_log bajo la
// clave del handler, y Phase A solo re-lee retry/dead-letter — un flag OFF descartaría los
// eventos de forma PERMANENTE. El handoff es una fila inerte en su propio aggregate (cero
// side effects fuera del dominio); el flag HIRING_HANDOFF_BRIDGES_ENABLED gatea solo los
// readers/bridges downstream.
//
// Boundary: materializeHandoffFromApplication NUNCA escribe members/assignments/placements/
// payroll_*/contractor_engagements/providers/expenses.

import { materializeHandoffFromApplication } from '@/lib/hiring/handoff'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

export const hiringHandoffMaterializeProjection: ProjectionDefinition = {
  name: 'hiring_handoff_materialize',
  description:
    'Materializa el HiringHandoff (aggregate propio) desde hiring.application.decided leyendo el snapshot actual de la application',
  domain: 'people',
  triggerEvents: [EVENT_TYPES.hiringApplicationDecided],

  // extractScope NUNCA retorna null para un payload canónico (decide.ts siempre incluye
  // applicationId). Si falta, el consumer lo acusa `no-op:no-scope` (loud en el log, nunca
  // silent-skip — Playbook V2).
  extractScope: (payload) => {
    const applicationId = typeof payload.applicationId === 'string' ? payload.applicationId.trim() : ''

    if (!applicationId) return null

    return { entityType: 'hiring_application', entityId: applicationId }
  },

  refresh: async (scope) => {
    const outcome = await materializeHandoffFromApplication(scope.entityId)

    switch (outcome.kind) {
      case 'created':
        return `handoff created (${outcome.handoff.state}) for application ${scope.entityId} → ${outcome.handoff.selectedDestination}`
      case 'superseded':
        return `handoff superseded (${outcome.handoff.state}) for application ${scope.entityId} → ${outcome.handoff.selectedDestination}`
      case 'blocked':
        return `handoff blocked (${outcome.handoff.blockedReason}) for application ${scope.entityId}`
      case 'revoked':
        return `handoff cancelled (decision revoked) for application ${scope.entityId}`
      case 'noop':
        // no-op EXPLÍCITO (p.ej. decision-not-selected): queda observable en el log como
        // `coalesced:no-op:<reason>` — un rechazo/backup nunca crea handoff.
        return `no-op:${outcome.reason}`
    }
  },
  maxRetries: 2,
}
