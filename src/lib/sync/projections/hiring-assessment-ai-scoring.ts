import 'server-only'

/**
 * TASK-1734 Slice 2 — Wiring async del scoring IA por assessment (ADR D4, pieza 1).
 *
 * Proyección reactiva LIVIANA: consume `hiring.assessment.submitted` y — SOLO si
 * `HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED` está ON en ESTE runtime (ops-worker;
 * prenderlo en Vercel no hace nada) — crea el run durable vía el command idempotente
 * `startAssessmentAiScoringRun` (replay/duplicado del evento resuelve al MISMO run).
 *
 * CERO llamadas a provider acá (regla dura del ADR): el fan-out LLM vive en el drain
 * `POST /assessment-ai/drain-scoring-runs` del ops-worker con claim atómico. Esta
 * proyección solo hace trabajo transaccional de milisegundos y no bloquea el lane
 * reactivo ni el publisher del outbox.
 *
 * Domain `notifications` → la drena la lane `ops-reactive-notifications` existente
 * (mismo precedente que hiring-lifecycle-emails), sin tocar deploy.sh ni Cloud Scheduler.
 */

import { startAssessmentAiScoringRun } from '@/lib/hiring/assessment/ai/scoring-run/commands'
import { isHiringAssessmentAiRunEnqueueEnabled } from '@/lib/hiring/assessment/ai/scoring-run/config'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

export const hiringAssessmentAiScoringProjection: ProjectionDefinition = {
  name: 'hiring_assessment_ai_scoring_run_enqueue',
  description:
    'TASK-1734 — hiring.assessment.submitted → crea el run durable de scoring IA (idempotente por digest; flag HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED, default OFF). El fan-out LLM es del drain, nunca de esta proyección.',
  domain: 'notifications',
  triggerEvents: [EVENT_TYPES.hiringAssessmentSubmitted],
  extractScope: payload => {
    const assessmentId = typeof payload.assessmentId === 'string' ? payload.assessmentId.trim() : ''

    if (!assessmentId) return null

    return { entityType: 'hiring_assessment', entityId: assessmentId }
  },
  refresh: async (scope, payload) => {
    if (!isHiringAssessmentAiRunEnqueueEnabled()) {
      return 'ai_scoring_run skip: HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED OFF'
    }

    const actorUserId = typeof payload.actorUserId === 'string' ? payload.actorUserId : null
    const result = await startAssessmentAiScoringRun(scope.entityId, actorUserId)

    return `ai_scoring_run ${result.created ? 'created' : 'existing'}: ${result.run.runId} status=${result.run.status} items=${result.items.length}`
  },
  maxRetries: 2
}
