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
import {
  attachAssignmentInstance,
  countAssignedInWindow,
  isRecoverableAssignmentOutcome,
  readAssignmentAttemptState,
  recordAssignment,
} from './assignment-store'
import { lockPolicyForUpdate } from './store'

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

/**
 * TASK-1755 — Sentinel del intento siguiente. **Sólo `confirmAssessmentAssignment` lo pasa**, y
 * eso es el contrato entero: la confirmación es one-shot por propuesta
 * (`lockAssignmentProposalForUpdate` + la guarda de `status`), así que un reintento de
 * TRANSPORTE de la misma petición nunca llega hasta acá — la segunda respuesta sale por la rama
 * `already_confirmed`. Llegar acá significa que una persona confirmó una propuesta que nunca se
 * había confirmado, o sea una decisión humana nueva. Esa es la condición que la idempotencia
 * necesita, y la da la IDENTIDAD de la propuesta.
 *
 * ⚠️ **NO se ata al digest de la propuesta, a propósito.** `templateStatus` no entra al material
 * del digest (`proposal-digest.ts`): activar una plantilla inactiva deja el efecto propuesto
 * idéntico. Con "digest distinto" como criterio, un `blocked: template_inactive` quedaría en
 * callejón permanente — que es justo el bug que esta task cierra.
 */
export const NEXT_ATTEMPT_AFTER_DEAD_END = 'next-after-dead-end'

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

/**
 * Readiness FAIL-CLOSED del destinatario: la duda nunca se resuelve enviando.
 *
 * Todos los fallos de readiness son `blocked`, NUNCA `held`. `held` está reservado al hold
 * HUMANO: mezclarlos borra la distinción entre "una persona lo detuvo" y "el dato está
 * incompleto", y además silencia la señal — sólo la rama `blocked` publica
 * `hiring.assessment.auto_assignment_blocked`, que es la que la risk matrix usa para detectar
 * "candidato sin email recibe asignación inútil".
 */
export const resolveRecipientReadiness = (
  email: string | null,
): { ok: true } | { ok: false; outcome: 'blocked'; reasonCode: AssessmentAssignmentReasonCode } => {
  const normalized = (email ?? '').trim().toLowerCase()

  if (!normalized) return { ok: false, outcome: 'blocked', reasonCode: 'missing_email' }

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
  /**
   * SÓLO un command humano puede pedir más de un intento (ADR D2 capa 3).
   *
   * - Un número: el intento EXACTO. Es lo que usa la automatización, que siempre escribe 1.
   * - `'next-after-dead-end'` (TASK-1755): resuélvelo contra el ledger bajo el lock de la
   *   policy. Abre el intento siguiente sólo si el intento vigente terminó en un resultado
   *   recuperable; si la clave está legítimamente ocupada devuelve SU número, para que el
   *   `ON CONFLICT` colisione y el caller reciba el replay honesto en vez de una asignación
   *   nueva. Lo pide el confirm humano y NADIE más.
   */
  attemptSeq?: number | typeof NEXT_ATTEMPT_AFTER_DEAD_END
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
    // `intent` no es un outcome comunicable: es el estado efímero entre el INSERT del ledger y
    // el UPDATE que le adjunta la instancia, en la misma transacción. Verlo en reposo significa
    // que un command murió a mitad de camino ⇒ es un FAULT (el dispatcher reintenta sin
    // comunicar), jamás un resultado que el fan-in pueda degradar al correo genérico.
    case 'intent':
      throw new HiringValidationError(
        'La asignación quedó a medio registrar.',
        'assessment_assignment_intent_unresolved',
        500,
      )
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

/**
 * `txClient` permite participar en la transacción del caller (mismo patrón que
 * `recordHiringApplicationNote`): el confirm de una propuesta marca la propuesta y ejecuta el
 * assignment ATÓMICAMENTE — o pasan las dos cosas, o no pasa ninguna. Sin cliente inyectado
 * abre su propia transacción, que es el camino del consumer reactivo y del route manual.
 */
export const assignAssessmentFromPolicy = async (
  input: AssignAssessmentFromPolicyInput,
  txClient: PoolClient | null = null,
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

  const requestedAttempt = input.attemptSeq ?? 1

  // Límite de autoridad (ADR D2 capa 3): un bug de la policy no genera la segunda prueba de
  // nadie. Es un fault deliberado, NO un outcome modelado — el caller automático está
  // pidiendo algo que no le corresponde.
  //
  // Se evalúa sobre lo PEDIDO y antes de resolver nada: un origen automático no puede ni
  // siquiera pedir el sentinel. El CHECK `(origin = 'manual' OR attempt_seq = 1)` de la base es
  // la última red, pero acá el error dice qué pasó en vez de reventar como violación de
  // constraint.
  if (input.origin !== 'manual' && requestedAttempt !== 1) {
    throw new HiringValidationError(
      'La asignación automática sólo puede registrar el primer intento.',
      'assessment_assignment_attempt_forbidden',
      409,
    )
  }

  const execute = async (client: PoolClient): Promise<AssessmentAssignmentResult> => {
    // `FOR UPDATE` sobre la fila de policy: serializa TODOS los assignments de esta policy
    // (grano exacto del cap de volumen) y ordena la carrera contra un `disable` concurrente.
    // Sin el lock, dos assigns simultáneos con cap=3 y count=2 pasaban los DOS, y un kill
    // switch no detenía la asignación en vuelo. `lockPolicyForUpdate` lanza si no existe.
    const policy = await lockPolicyForUpdate(client, policyId)

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

    // TASK-1755 — En qué casillero del ledger va este intento. Corre BAJO el `FOR UPDATE` de la
    // policy que tomó `lockPolicyForUpdate` unas líneas más arriba: ese lock serializa TODOS los
    // assignments de la policy, y cuando el caller es el confirm humano se sostiene además
    // dentro de la MISMA transacción que ya tiene bloqueada la fila de la propuesta. O sea: el
    // cálculo del intento siguiente no puede cruzarse con otro que esté resolviendo el suyo.
    const attemptSeq = await resolveAttemptSeq(
      client,
      { applicationId, policyId: policy.policyId, policyVersion: policy.policyVersion, triggerStage },
      requestedAttempt,
    )

    // Defensa en profundidad del límite de autoridad: la guarda de arriba mira lo pedido, ésta
    // mira lo resuelto. Ningún camino automático puede terminar escribiendo un intento > 1.
    if (input.origin !== 'manual' && attemptSeq > 1) {
      throw new HiringValidationError(
        'La asignación automática sólo puede registrar el primer intento.',
        'assessment_assignment_attempt_forbidden',
        409,
      )
    }

    const { assignment, created } = await recordAssignment(client, {
      applicationId,
      policyId: policy.policyId,
      policyVersion: policy.policyVersion,
      triggerStage,
      attemptSeq,
      origin: input.origin,
      // El intent es el hecho durable; la instancia es su consecuencia. Por eso se registra
      // ANTES de crearla — pero `assigned` sin instancia viola
      // `hiring_assessment_assignment_assigned_instance_ck` (y sería un ledger que miente). Se
      // escribe el estado NO TERMINAL `intent` y `attachAssignmentInstance` lo cierra a
      // `assigned | already_assigned` en esta misma transacción.
      outcome: intent.outcome === 'assigned' ? 'intent' : intent.outcome,
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
  }

  if (txClient) return execute(txClient)

  return withGreenhousePostgresTransaction(execute)
}

/**
 * TASK-1755 — Traduce lo que el caller pidió al `attempt_seq` que se va a escribir.
 *
 * Con el sentinel hay exactamente tres respuestas, y la del medio es la peligrosa:
 *
 * 1. **Sin intento vigente** (no hay historia, o todos quedaron superseded por una cancelación)
 *    ⇒ `max + 1`. Monotónico contra TODA la historia, superseded incluida: reusar el rótulo de
 *    un intento cancelado dejaría dos filas distintas diciendo "intento 2".
 * 2. **El intento vigente terminó en un resultado recuperable** (`blocked`/`held`/`stale`) ⇒
 *    `max + 1`. La causa vive fuera del ledger y pudo corregirse; esto es lo que devuelve la
 *    capacidad de asignar.
 * 3. **Cualquier otro resultado vigente** (`assigned`, `already_assigned`, `intent`, una
 *    `cancelled` que por lo que sea siguiera vigente) ⇒ **SU MISMO número**, nunca 1 ni uno
 *    libre. Devolver un casillero vacío acá sería el bug caro de todos: insertaría una fila
 *    nueva junto a un `assigned` vivo y le crearía una SEGUNDA prueba al mismo candidato.
 *    Devolviendo el suyo, el `ON CONFLICT` colisiona y `resultFromRecord(replay)` responde
 *    `already_assigned` — o lanza el fault, si la fila estaba en `intent`.
 */
const resolveAttemptSeq = async (
  client: PoolClient,
  key: {
    applicationId: string
    policyId: string
    policyVersion: number
    triggerStage: AssessmentAssignmentTrigger
  },
  requested: number | typeof NEXT_ATTEMPT_AFTER_DEAD_END,
): Promise<number> => {
  if (typeof requested === 'number') return Math.max(1, Math.floor(requested))

  const { maxAttemptSeq, latestActive } = await readAssignmentAttemptState(client, key)

  if (!latestActive) return maxAttemptSeq + 1

  return isRecoverableAssignmentOutcome(latestActive.outcome) ? maxAttemptSeq + 1 : latestActive.attemptSeq
}

/**
 * TASK-1771 — EVALUACIÓN VIVA de una clave ya registrada: «¿esta causa seguiría bloqueando hoy?».
 *
 * Existe para que el supersede del carril automático (`supersede-dead-end.ts`) y su cola de
 * lectura reusen **el mismo** `resolveAssignmentIntent` que decide un assignment real, en vez de
 * reimplementar sus siete condiciones. La duplicación acá no sería un detalle de estilo: dos
 * definiciones de "por qué se bloqueó" divergen, y el supersede empezaría a reabrir claves que el
 * assignment vuelve a bloquear — el bucle exacto que ese command existe para impedir.
 *
 * Carga el snapshot vigente de la postulación y delega. NO escribe nada y NO decide si
 * corresponde superseder: eso lo resuelve el command con su tope y su condición de avance.
 *
 * El caller DEBE tener la fila de policy bloqueada (`FOR UPDATE`) antes de llamar cuando el
 * resultado vaya a sostener una escritura: `volume_cap` se auto-cura con la ventana móvil, así
 * que una evaluación tomada fuera del lock describe un instante que ya pasó.
 *
 * `origin` y `triggerStage` se pasan tal como quedaron REGISTRADOS en la fila: evaluar un
 * `stage_auto` como si fuera manual saltaría el cap de volumen y la guarda de modo, que son dos
 * de las condiciones que más bloquean.
 */
export const resolveLiveAssignmentIntent = async (
  client: PoolClient,
  policy: OpeningAssessmentPolicy,
  applicationId: string,
  origin: AssessmentAssignmentOrigin,
  triggerStage: AssessmentAssignmentTrigger,
): Promise<{ outcome: AssessmentAssignmentOutcome; reasonCode: AssessmentAssignmentReasonCode | null }> => {
  const application = await loadApplicationSnapshot(client, applicationId)

  if (!application) {
    throw new HiringNotFoundError('La postulación no existe.', 'hiring_application_not_found')
  }

  return resolveAssignmentIntent(client, policy, application, origin, triggerStage)
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
