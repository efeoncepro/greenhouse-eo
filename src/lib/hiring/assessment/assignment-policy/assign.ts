import 'server-only'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import {
  ASSESSMENT_ASSIGNMENT_ORIGINS,
  type AssessmentAssignmentOrigin,
  type AssessmentAssignmentOutcome,
  type AssessmentAssignmentReasonCode,
  type AssessmentAssignmentResult,
  type AssessmentAssignmentTrigger,
  type OpeningAssessmentPolicy,
} from '@/types/hiring-assessment-policy'

import { HiringNotFoundError, HiringValidationError } from '../../errors'
import { insertCandidateTest } from '../instances'
import { attachAssignmentInstance, countAssignedInWindow, recordAssignment } from './assignment-store'
import { getPolicyById } from './store'

/**
 * TASK-1719 Slice 2 — COMMAND COMÚN de assignment. Las dos rutas (confirmación humana y
 * entrada a etapa) convergen acá; ninguna acepta `templateId` del caller — Greenhouse lo
 * resuelve server-side desde la policy de la vacante.
 *
 * Contrato duro: **devuelve outcome tipado, jamás lanza para un caso modelado**. Un throw
 * significa fault (fallo transitorio o dato roto) y el dispatcher reintenta SIN comunicar;
 * un outcome terminal (`held|blocked|stale`) es una condición estable que el fan-in de
 * comunicación degrada al correo genérico en la misma ejecución (ADR D1).
 *
 * ADR D2 capa 3: la automatización SOLO escribe `attempt_seq = 1`. Retake y re-asignación
 * post-cancelación son commands humanos con capability y razón — un bug de la policy no
 * puede generar la segunda prueba de nadie.
 */

/**
 * D5.3 — Denylist de dominios no entregables. **Capa DESECHABLE**: se retira cuando
 * `TASK-1739` aterrice `data_origin`. Queda declarada así justamente para que nadie la trate
 * como permanente.
 */
const UNDELIVERABLE_EMAIL_DOMAIN_SUFFIXES = ['.test', '.invalid', '.local', '.localhost', '.example'] as const

interface ApplicationSnapshot {
  applicationId: string
  openingId: string
  stage: string
  decision: string | null
  candidateEmail: string | null
}

const str = (v: unknown): string => (v == null ? '' : String(v))

/**
 * Estado VIGENTE de la postulación leído dentro de la transacción (ADR D0a): la etapa NUNCA
 * sale de `payload.stage` — el consumer reactivo hace coalescing por scope y conserva el
 * último payload, así que la etapa intermedia se pierde en silencio.
 */
const loadApplicationSnapshot = async (
  client: PoolClient,
  applicationId: string,
): Promise<ApplicationSnapshot | null> => {
  const result = await client.query(
    `SELECT app.application_id, app.opening_id, app.stage, app.decision, ip.canonical_email
     FROM greenhouse_hiring.hiring_application app
     JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = app.identity_profile_id
     WHERE app.application_id = $1
     LIMIT 1`,
    [applicationId],
  )

  const row = result.rows[0] as
    | { application_id: string; opening_id: string; stage: string; decision: string | null; canonical_email: string | null }
    | undefined

  if (!row) return null

  return {
    applicationId: row.application_id,
    openingId: row.opening_id,
    stage: row.stage,
    decision: row.decision,
    candidateEmail: row.canonical_email?.trim() || null,
  }
}

const loadTemplateStatus = async (client: PoolClient, templateId: string): Promise<string | null> => {
  const result = await client.query(
    `SELECT status FROM greenhouse_hiring.hiring_assessment_template WHERE template_id = $1 LIMIT 1`,
    [templateId],
  )

  return (result.rows[0] as { status: string } | undefined)?.status ?? null
}

/** Readiness FAIL-CLOSED del destinatario: la duda nunca se resuelve enviando. */
export const resolveRecipientReadiness = (
  email: string | null,
): { ok: true } | { ok: false; outcome: 'held' | 'blocked'; reasonCode: AssessmentAssignmentReasonCode } => {
  const normalized = (email ?? '').trim().toLowerCase()

  if (!normalized) return { ok: false, outcome: 'held', reasonCode: 'missing_email' }

  const at = normalized.lastIndexOf('@')
  const domain = at > 0 ? normalized.slice(at + 1) : ''

  if (!domain || domain.includes(' ') || !domain.includes('.')) {
    return { ok: false, outcome: 'blocked', reasonCode: 'unverified_recipient' }
  }

  if (UNDELIVERABLE_EMAIL_DOMAIN_SUFFIXES.some(suffix => domain === suffix.slice(1) || domain.endsWith(suffix))) {
    return { ok: false, outcome: 'blocked', reasonCode: 'unverified_recipient' }
  }

  return { ok: true }
}

export interface AssignAssessmentFromPolicyInput {
  applicationId: string
  policyId: string
  origin: AssessmentAssignmentOrigin
  actorUserId: string | null
  /** Requerido para orígenes automáticos; `manual` cuando lo confirma una persona. */
  triggerStage?: AssessmentAssignmentTrigger | null
  /** SÓLO un command humano puede pedir > 1 (ADR D2 capa 3). */
  attemptSeq?: number
}

const terminalResult = (
  assignmentId: string,
  outcome: Extract<AssessmentAssignmentOutcome, 'held' | 'blocked' | 'stale'>,
  reasonCode: AssessmentAssignmentReasonCode,
): AssessmentAssignmentResult => {
  if (outcome === 'held') return { status: 'held', assignmentId, reasonCode }
  if (outcome === 'stale') return { status: 'stale', assignmentId, reasonCode }

  return { status: 'blocked', assignmentId, reasonCode }
}

/**
 * Traduce la fila del ledger al resultado de ESTA llamada. La distinción importa: el ledger
 * registra qué pasó (`assigned`), mientras que el resultado le dice al caller qué hizo SU
 * llamada. En un replay de un intento ya `assigned` la respuesta correcta es
 * `already_assigned` — el caller nunca debe leerlo como "acabo de mandar el correo".
 */
const resultFromRecord = (
  record: {
    assignmentId: string
    assessmentId: string | null
    outcome: AssessmentAssignmentOutcome
    outcomeReason: AssessmentAssignmentReasonCode | null
  },
  options: { replay?: boolean } = {},
): AssessmentAssignmentResult => {
  if (options.replay && record.outcome === 'assigned') {
    return { status: 'already_assigned', assignmentId: record.assignmentId, assessmentId: record.assessmentId }
  }

  switch (record.outcome) {
    case 'assigned':
      return {
        status: 'assigned',
        assignmentId: record.assignmentId,
        assessmentId: record.assessmentId ?? '',
        deliveryStatus: 'pending',
      }
    case 'already_assigned':
      return { status: 'already_assigned', assignmentId: record.assignmentId, assessmentId: record.assessmentId }
    case 'cancelled':
      return { status: 'cancelled', assignmentId: record.assignmentId, reasonCode: record.outcomeReason }
    default:
      return terminalResult(
        record.assignmentId,
        record.outcome,
        record.outcomeReason ?? 'policy_disabled',
      )
  }
}

export const assignAssessmentFromPolicy = async (
  input: AssignAssessmentFromPolicyInput,
): Promise<AssessmentAssignmentResult> => {
  const applicationId = str(input.applicationId).trim()
  const policyId = str(input.policyId).trim()

  if (!applicationId || !policyId) {
    throw new HiringValidationError(
      'applicationId y policyId son obligatorios.',
      'assessment_assignment_field_required',
      400,
    )
  }

  if (!ASSESSMENT_ASSIGNMENT_ORIGINS.includes(input.origin)) {
    throw new HiringValidationError(
      'El origen de la asignación no es válido.',
      'assessment_assignment_invalid_origin',
      400,
    )
  }

  const attemptSeq = Math.max(1, Math.floor(input.attemptSeq ?? 1))

  // Límite de autoridad (ADR D2 capa 3): un bug de la policy no genera la segunda prueba de
  // nadie. Es un fault deliberado, NO un outcome modelado — el caller automático está
  // pidiendo algo que no le corresponde.
  if (input.origin !== 'manual' && attemptSeq > 1) {
    throw new HiringValidationError(
      'La asignación automática sólo puede registrar el primer intento.',
      'assessment_assignment_attempt_forbidden',
      409,
    )
  }

  return withGreenhousePostgresTransaction(async (client) => {
    const policy = await getPolicyById(policyId, client)

    if (!policy) {
      throw new HiringNotFoundError('La policy de evaluación no existe.', 'assessment_policy_not_found')
    }

    const application = await loadApplicationSnapshot(client, applicationId)

    if (!application) {
      throw new HiringNotFoundError('La postulación no existe.', 'hiring_application_not_found')
    }

    if (application.openingId !== policy.openingId) {
      throw new HiringValidationError(
        'La postulación no pertenece a la vacante de esta policy.',
        'assessment_assignment_policy_mismatch',
        409,
      )
    }

    const triggerStage: AssessmentAssignmentTrigger =
      input.origin === 'manual' ? (input.triggerStage ?? 'manual') : (input.triggerStage ?? policy.triggerStage ?? 'manual')

    const intent = await resolveAssignmentIntent(client, policy, application, input.origin, triggerStage)

    const { assignment, created } = await recordAssignment(client, {
      applicationId,
      policyId: policy.policyId,
      policyVersion: policy.policyVersion,
      triggerStage,
      attemptSeq,
      origin: input.origin,
      outcome: intent.outcome,
      outcomeReason: intent.reasonCode,
      assessmentId: null,
      actorUserId: input.actorUserId,
    })

    // Replay / carrera: el intento ya está registrado. Devolvemos su outcome tal cual y NO
    // ejecutamos ningún side effect (ni instancia, ni evento, ni correo).
    if (!created) return resultFromRecord(assignment, { replay: true })

    if (intent.outcome !== 'assigned') {
      await publishAssignmentRecorded(client, assignment.assignmentId, {
        applicationId,
        policy,
        origin: input.origin,
        triggerStage,
        attemptSeq,
        outcome: intent.outcome,
        reasonCode: intent.reasonCode,
        assessmentId: null,
      })

      if (intent.outcome === 'blocked') {
        await publishOutboxEvent(
          {
            aggregateType: AGGREGATE_TYPES.hiringAssessmentAssignment,
            aggregateId: assignment.assignmentId,
            eventType: EVENT_TYPES.hiringAssessmentAutoAssignmentBlocked,
            payload: {
              assignmentId: assignment.assignmentId,
              applicationId,
              policyId: policy.policyId,
              policyVersion: policy.policyVersion,
              origin: input.origin,
              reasonCode: intent.reasonCode,
            },
          },
          client,
        )
      }

      return resultFromRecord(assignment)
    }

    const instance = await insertCandidateTest(
      client,
      {
        applicationId,
        templateId: policy.templateId,
        timeLimitMinutes: policy.timeLimitMinutes,
      },
      input.actorUserId,
    )

    // La instancia ya existía (p.ej. asignada a mano por el route legacy). No re-emitimos el
    // evento: eso mandaría un segundo correo con un link que además ya no sería el vigente.
    if (!instance.created) {
      const corrected = await attachAssignmentInstance(client, assignment.assignmentId, {
        assessmentId: instance.assessment.assessmentId,
        outcome: 'already_assigned',
        outcomeReason: 'existing_open_instance',
      })

      await publishAssignmentRecorded(client, assignment.assignmentId, {
        applicationId,
        policy,
        origin: input.origin,
        triggerStage,
        attemptSeq,
        outcome: 'already_assigned',
        reasonCode: 'existing_open_instance',
        assessmentId: instance.assessment.assessmentId,
      })

      return resultFromRecord(corrected)
    }

    const closed = await attachAssignmentInstance(client, assignment.assignmentId, {
      assessmentId: instance.assessment.assessmentId,
      outcome: 'assigned',
      outcomeReason: null,
    })

    // El evento que dispara el correo al candidato. El token NUNCA viaja acá: el consumer lo
    // re-emite server-side justo antes del envío.
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringAssessment,
        aggregateId: instance.assessment.assessmentId,
        eventType: EVENT_TYPES.hiringAssessmentAssigned,
        payload: {
          assessmentId: instance.assessment.assessmentId,
          applicationId,
          templateId: policy.templateId,
          method: 'candidate_test',
        },
      },
      client,
    )

    await publishAssignmentRecorded(client, assignment.assignmentId, {
      applicationId,
      policy,
      origin: input.origin,
      triggerStage,
      attemptSeq,
      outcome: 'assigned',
      reasonCode: null,
      assessmentId: instance.assessment.assessmentId,
    })

    return resultFromRecord(closed)
  })
}

/**
 * Decide el outcome ANTES de tocar el ledger. Todas las condiciones se leen del estado
 * vigente en PostgreSQL dentro de la misma transacción.
 */
const resolveAssignmentIntent = async (
  client: PoolClient,
  policy: OpeningAssessmentPolicy,
  application: ApplicationSnapshot,
  origin: AssessmentAssignmentOrigin,
  triggerStage: AssessmentAssignmentTrigger,
): Promise<{ outcome: AssessmentAssignmentOutcome; reasonCode: AssessmentAssignmentReasonCode | null }> => {
  if (policy.state !== 'enabled') {
    return { outcome: 'blocked', reasonCode: 'policy_disabled' }
  }

  // Una policy `manual` nunca dispara desde la automatización: configurarla no la habilitó
  // para escribirle a una cohorte.
  if (origin !== 'manual' && policy.mode !== 'on_stage_entry') {
    return { outcome: 'blocked', reasonCode: 'policy_mode_manual' }
  }

  if (application.decision) {
    return { outcome: 'stale', reasonCode: 'application_decided' }
  }

  // ADR D0a: la etapa se compara contra el estado VIGENTE, nunca contra el payload del evento.
  if (origin !== 'manual' && application.stage !== triggerStage) {
    return { outcome: 'stale', reasonCode: 'stage_changed' }
  }

  const templateStatus = await loadTemplateStatus(client, policy.templateId)

  if (templateStatus !== 'active') {
    return { outcome: 'blocked', reasonCode: 'template_inactive' }
  }

  const readiness = resolveRecipientReadiness(application.candidateEmail)

  if (!readiness.ok) {
    return { outcome: readiness.outcome, reasonCode: readiness.reasonCode }
  }

  // D5.2 — cap de volumen por opening/ventana con auto-detención. Un error de configuración
  // se paga con N correos, no con la cohorte entera. Sólo aplica a la automatización: una
  // confirmación humana ya pasó por un juicio.
  if (origin !== 'manual') {
    const assignedInWindow = await countAssignedInWindow(client, policy.policyId, policy.volumeWindowMinutes)

    if (assignedInWindow >= policy.volumeCapPerWindow) {
      return { outcome: 'blocked', reasonCode: 'volume_cap' }
    }
  }

  return { outcome: 'assigned', reasonCode: null }
}

/** Evento de auditoría del ledger. IDs-only: nunca email, nombre, token ni score. */
const publishAssignmentRecorded = async (
  client: PoolClient,
  assignmentId: string,
  detail: {
    applicationId: string
    policy: OpeningAssessmentPolicy
    origin: AssessmentAssignmentOrigin
    triggerStage: AssessmentAssignmentTrigger
    attemptSeq: number
    outcome: AssessmentAssignmentOutcome
    reasonCode: AssessmentAssignmentReasonCode | null
    assessmentId: string | null
  },
): Promise<void> => {
  await publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.hiringAssessmentAssignment,
      aggregateId: assignmentId,
      eventType: EVENT_TYPES.hiringAssessmentAssignmentRecorded,
      payload: {
        assignmentId,
        applicationId: detail.applicationId,
        policyId: detail.policy.policyId,
        policyVersion: detail.policy.policyVersion,
        openingId: detail.policy.openingId,
        templateId: detail.policy.templateId,
        origin: detail.origin,
        triggerStage: detail.triggerStage,
        attemptSeq: detail.attemptSeq,
        outcome: detail.outcome,
        reasonCode: detail.reasonCode,
        assessmentId: detail.assessmentId,
      },
    },
    client,
  )
}
