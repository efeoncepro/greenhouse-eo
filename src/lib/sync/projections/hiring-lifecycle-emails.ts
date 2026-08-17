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
  sendHiringDecisionEmail
} from '@/lib/hiring/notifications'
import { resolveStageChangeCandidateComms } from '@/lib/hiring/stage-comms'
import { sendTalentPoolVerificationEmail } from '@/lib/hiring/talent-pool'
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
  maxRetries: 3
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
  maxRetries: 3
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
  maxRetries: 3
}

/**
 * TASK-1719 Slices 4/5 — ABSORBE a `hiring_stage_changed_email` (TASK-1689).
 *
 * Un solo consumer decide qué recibe el candidato por un cambio de etapa: el correo del
 * test asignado, o el genérico de avance, nunca ambos y nunca ninguno. Mientras eran dos
 * projections independientes sobre el mismo evento, ninguna de las dos podía garantizarlo.
 *
 * ⚠️ El `name` cambió, o sea el `handler` key cambió. La Phase A del consumer reactivo no
 * filtra por fecha, así que en la primera corrida este handler ve TODO el histórico de
 * `stage_changed` como no procesado. Lo cubre la ventana de accionabilidad de
 * `stage-comms/config.ts`: un evento fuera de ella no comunica ni asigna.
 */
export const hiringStageChangedCandidateCommsProjection: ProjectionDefinition = {
  name: 'hiring_stage_changed_candidate_comms',
  description:
    'TASK-1719 — hiring.application.stage_changed → decide UNA comunicación al candidato: asigna el test según la policy de la vacante (correo del test) o degrada al aviso genérico de avance. Re-lee la etapa vigente en PostgreSQL; nunca confía en payload.stage.',
  domain: 'notifications',
  triggerEvents: [EVENT_TYPES.hiringApplicationStageChanged],
  extractScope: applicationScope,
  refresh: async (scope, payload) => resolveStageChangeCandidateComms(scope.entityId, payload),
  maxRetries: 3
}

export const hiringApplicationDecidedEmailProjection: ProjectionDefinition = {
  name: 'hiring_application_decided_email',
  description:
    'TASK-1689 — hiring.application.decided → email de decisión (selected = felicitación · rejected = agradecimiento, pausable independiente). Anti-stale: verifica la decisión vigente en PG.',
  domain: 'notifications',
  triggerEvents: [EVENT_TYPES.hiringApplicationDecided],
  extractScope: applicationScope,
  refresh: async (scope, payload) => sendHiringDecisionEmail(scope.entityId, payload),
  maxRetries: 3
}

export const talentPoolVerificationEmailProjection: ProjectionDefinition = {
  name: 'talent_pool_verification_email',
  description:
    'TASK-1724 — talent_pool.consent_requested → email verificable con token re-emitido; PII y token nunca viajan por outbox.',
  domain: 'notifications',
  triggerEvents: [EVENT_TYPES.talentPoolConsentRequested],
  extractScope: payload => {
    const consentEventId = typeof payload.consentEventId === 'string' ? payload.consentEventId.trim() : ''

    if (!consentEventId) return null

    return { entityType: 'talent_pool_consent_event', entityId: consentEventId }
  },
  refresh: async (scope, payload) => sendTalentPoolVerificationEmail(scope.entityId, payload),
  maxRetries: 3
}
