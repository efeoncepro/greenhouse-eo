import 'server-only'

/**
 * TASK-1689 — Consumers reactivos de los emails transaccionales del ciclo de Hiring.
 *
 * Cinco projections (un archivo: comparten shape y política) sobre eventos que el dominio
 * hiring YA emite. Cuerpos en `src/lib/hiring/notifications/send.ts`: re-leen PG por ID
 * (los eventos no llevan PII), pre-chequean dedupe (`wasEmailAlreadySent`) y envían por la
 * plataforma canónica. Gateados por `HIRING_LIFECYCLE_EMAILS_ENABLED` (default OFF; el flag
 * vive en el ops-worker — prenderlo en Vercel no hace nada) + kill-switch por tipo en
 * `email_type_config` (el tipo `hiring_decision_rejected` es pausable independiente).
 *
 * Domain `notifications` → los drena la lane `ops-reactive-notifications` (cada 2 min) sin
 * tocar deploy.sh ni Cloud Scheduler.
 */

import {
  sendHiringApplicationCreatedEmails,
  sendHiringAssessmentAssignedEmail,
  sendHiringAssessmentSubmittedInternalEmail,
  sendHiringDecisionEmail,
  sendHiringStageAdvancedEmail,
} from '@/lib/hiring/notifications'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

const applicationScope = (payload: Record<string, unknown>) => {
  const applicationId = typeof payload.applicationId === 'string' ? payload.applicationId.trim() : ''

  if (!applicationId) return null

  return { entityType: 'hiring_application', entityId: applicationId }
}

export const hiringApplicationCreatedEmailsProjection: ProjectionDefinition = {
  name: 'hiring_application_created_emails',
  description:
    'TASK-1689 — hiring.application.created → aviso interno a People (datos del postulante) + acuse de recibo al candidato.',
  domain: 'notifications',
  triggerEvents: [EVENT_TYPES.hiringApplicationCreated],
  extractScope: applicationScope,
  refresh: async (scope, payload) => sendHiringApplicationCreatedEmails(scope.entityId, payload),
  maxRetries: 3,
}

export const hiringAssessmentAssignedEmailProjection: ProjectionDefinition = {
  name: 'hiring_assessment_assigned_email',
  description:
    'TASK-1689 — hiring.assessment.assigned (sólo candidate_test) → email al candidato con link de acceso (token re-emitido de forma canónica; nunca viaja por el outbox).',
  domain: 'notifications',
  triggerEvents: [EVENT_TYPES.hiringAssessmentAssigned],
  extractScope: payload => {
    const assessmentId = typeof payload.assessmentId === 'string' ? payload.assessmentId.trim() : ''

    if (!assessmentId) return null

    return { entityType: 'hiring_assessment', entityId: assessmentId }
  },
  refresh: async (scope, payload) => sendHiringAssessmentAssignedEmail(scope.entityId, payload),
  maxRetries: 3,
}

export const hiringAssessmentSubmittedInternalEmailProjection: ProjectionDefinition = {
  name: 'hiring_assessment_submitted_internal_email',
  description:
    'hiring.assessment.submitted (sólo candidate_test) → aviso interno a People cuando las respuestas quedan listas para revisión.',
  domain: 'notifications',
  triggerEvents: [EVENT_TYPES.hiringAssessmentSubmitted],
  extractScope: payload => {
    const assessmentId = typeof payload.assessmentId === 'string' ? payload.assessmentId.trim() : ''

    if (!assessmentId) return null

    return { entityType: 'hiring_assessment', entityId: assessmentId }
  },
  refresh: async (scope, payload) => sendHiringAssessmentSubmittedInternalEmail(scope.entityId, payload),
  maxRetries: 3,
}

export const hiringStageChangedEmailProjection: ProjectionDefinition = {
  name: 'hiring_stage_changed_email',
  description:
    'TASK-1689 — hiring.application.stage_changed → email de avance al candidato SOLO para etapas candidate-facing (allowlist con nombre público; etapas internas nunca).',
  domain: 'notifications',
  triggerEvents: [EVENT_TYPES.hiringApplicationStageChanged],
  extractScope: applicationScope,
  refresh: async (scope, payload) => sendHiringStageAdvancedEmail(scope.entityId, payload),
  maxRetries: 3,
}

export const hiringApplicationDecidedEmailProjection: ProjectionDefinition = {
  name: 'hiring_application_decided_email',
  description:
    'TASK-1689 — hiring.application.decided → email de decisión (selected = felicitación · rejected = agradecimiento, pausable independiente). Anti-stale: verifica la decisión vigente en PG.',
  domain: 'notifications',
  triggerEvents: [EVENT_TYPES.hiringApplicationDecided],
  extractScope: applicationScope,
  refresh: async (scope, payload) => sendHiringDecisionEmail(scope.entityId, payload),
  maxRetries: 3,
}
