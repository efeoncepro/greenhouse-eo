import 'server-only'

import { wasEmailDispatchedForEntity } from '@/lib/email/delivery'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import {
  ASSESSMENT_CANCELLABLE_STATUSES,
  ASSESSMENT_CANCELLATION_NOTE_MAX_LENGTH,
  ASSESSMENT_CANCELLATION_REASON_CODES,
  type Assessment,
  type AssessmentCancellationReasonCode,
  type AssessmentStatus,
} from '@/types/hiring-assessment'

import { ASSESSMENT_COLS, normalizeAssessment, type AssessmentRow } from './instances'
import { supersedeAssignmentsForAssessment } from './assignment-policy/assignment-store'
import { HiringNotFoundError, HiringValidationError } from '../errors'

/**
 * TASK-1719 Slice 3 — Cancelación gobernada de un candidate_test + recuperación.
 *
 * Vive en su propio módulo (NO en `assignment-policy/`): cancelar es un command humano con
 * actor y razón, no una decisión de la policy. NO se gatea por flag — drenar la recuperación
 * siempre debe poder, igual que `cancelAssessmentAiScoringRun`.
 *
 * ⚠️ LA RECUPERACIÓN SON DOS LLAVES, NO UNA. Hay dos índices de unicidad distintos en juego y
 * cancelar tiene que liberar LOS DOS:
 *
 * 1. `hiring_assessment_open_instance_unique_idx` sobre (application_id, template_id): `cancelled`
 *    queda fuera de su predicado, así que se libera SOLO — es estructural, no un write.
 * 2. El índice del LEDGER sobre (application_id, policy_id, policy_version, trigger_stage,
 *    attempt_seq) WHERE `superseded_at IS NULL`: ése NO se libera solo. Requiere el write
 *    explícito `supersedeAssignmentsForAssessment`, que va en esta misma transacción.
 *
 * Sin (2), cancelar dejaba la fila vigente diciendo `outcome='assigned'` y apuntando a la
 * instancia muerta: re-asignar por el command gobernado devolvía `already_assigned` con el
 * assessmentId CANCELADO — 200, sin instancia nueva, sin correo — y en el carril automático
 * `decide.ts` leía ese `assigned` y no comunicaba NADA. La fila cancelada nunca se borra: se
 * supersede y queda como evidencia.
 */

/** Motivo (allowlist) + nota opcional acotada. La nota NUNCA viaja al outbox. */
export interface CancelCandidateTestInput {
  assessmentId: string
  reasonCode: AssessmentCancellationReasonCode
  note?: string | null
  /**
   * Guard optimista: el estado que el operador creía estar cancelando. `hiring_assessment`
   * no tiene columna `version`, así que el expected-version se expresa contra el `status`
   * leído bajo `FOR UPDATE` (mismo patrón que `saveResponse`). Omitirlo = sin guard.
   */
  expectedStatus?: AssessmentStatus | null
}

export type CancelCandidateTestOutcome = 'cancelled' | 'already_cancelled'

export interface CancelCandidateTestResult {
  assessment: Assessment
  /** `already_cancelled` = no-op idempotente; repetir la cancelación nunca es un error. */
  outcome: CancelCandidateTestOutcome
  /**
   * Comunicación correctiva honesta: si el enlace YA salió hacia el candidato, cancelar deja
   * un link muerto en su bandeja. NO se envía correo automático (no hay plantilla aprobada):
   * el contrato es declarar el pendiente para que una persona actúe. NUNCA silencio.
   */
  operatorFollowupRequired: boolean
  followupReason: 'candidate_link_already_delivered' | null
}

/** Email transaccional que entrega el link público al candidato (`src/lib/hiring/notifications/send.ts`). */
const ASSESSMENT_ASSIGNED_EMAIL_TYPE = 'hiring_assessment_assigned'

/** Mensaje es-CL por estado no cancelable. Explica el porqué, no sólo que no se pudo. */
const NOT_CANCELLABLE_MESSAGES: Record<string, string> = {
  in_progress: 'No se puede cancelar: el candidato ya comenzó a rendir esta evaluación. Cancelarla borraría su trabajo.',
  submitted: 'No se puede cancelar: el candidato ya entregó esta evaluación.',
  scored: 'No se puede cancelar: esta evaluación ya está corregida.',
  expired: 'No se puede cancelar: esta evaluación ya venció.',
}

export const cancelCandidateTest = async (
  input: CancelCandidateTestInput,
  actorUserId: string,
): Promise<CancelCandidateTestResult> => {
  if (!actorUserId) {
    throw new HiringValidationError('Falta el usuario que cancela.', 'assessment_cancel_missing_actor', 401)
  }

  const assessmentId = input.assessmentId ? String(input.assessmentId) : ''

  if (!assessmentId) {
    throw new HiringValidationError('assessmentId es obligatorio.', 'assessment_field_required', 400)
  }

  if (!ASSESSMENT_CANCELLATION_REASON_CODES.includes(input.reasonCode)) {
    throw new HiringValidationError(
      'Debes elegir un motivo de cancelación válido.',
      'assessment_cancel_invalid_reason',
      400,
    )
  }

  const note = input.note == null ? null : String(input.note).trim() || null

  if (note && note.length > ASSESSMENT_CANCELLATION_NOTE_MAX_LENGTH) {
    throw new HiringValidationError(
      `La nota no puede superar los ${ASSESSMENT_CANCELLATION_NOTE_MAX_LENGTH} caracteres.`,
      'assessment_cancel_note_too_long',
      400,
    )
  }

  const { assessment, outcome, previousStatus } = await withGreenhousePostgresTransaction(async client => {
    const locked = await client.query(
      `SELECT ${ASSESSMENT_COLS} FROM greenhouse_hiring.hiring_assessment
       WHERE assessment_id = $1 LIMIT 1 FOR UPDATE`,
      [assessmentId],
    )

    const current = (locked.rows as AssessmentRow[])[0]

    if (!current) throw new HiringNotFoundError('La evaluación no existe.', 'assessment_not_found')

    const before = normalizeAssessment(current)

    if (before.method !== 'candidate_test') {
      throw new HiringValidationError(
        'Solo se pueden cancelar las evaluaciones enviadas al candidato.',
        'assessment_cancel_method_not_supported',
        409,
      )
    }

    // Idempotencia: repetir la cancelación devuelve el mismo estado, nunca un error.
    // Se evalúa ANTES del guard de `expectedStatus` a propósito: un reintento del mismo
    // operador (doble click, retry de red) no puede convertirse en 409.
    if (before.status === 'cancelled') {
      return { assessment: before, outcome: 'already_cancelled' as const, previousStatus: before.status }
    }

    if (input.expectedStatus && input.expectedStatus !== before.status) {
      throw new HiringValidationError(
        'La evaluación cambió de estado mientras la revisabas. Vuelve a cargarla antes de cancelar.',
        'assessment_cancel_stale_state',
        409,
        { status: before.status },
      )
    }

    if (!(ASSESSMENT_CANCELLABLE_STATUSES as readonly string[]).includes(before.status)) {
      throw new HiringValidationError(
        NOT_CANCELLABLE_MESSAGES[before.status] ?? 'Esta evaluación ya no se puede cancelar.',
        'assessment_cancel_candidate_started',
        409,
        { status: before.status },
      )
    }

    // El token se invalida en el mismo write que el estado (defensa en profundidad): el
    // filtro de estado de `resolveAssessmentByToken` ya excluye `cancelled`, pero un hash
    // vivo apuntando a una instancia muerta no tiene ninguna razón de existir.
    const updated = await client.query(
      `UPDATE greenhouse_hiring.hiring_assessment
       SET status = 'cancelled', access_token_hash = NULL, updated_at = NOW()
       WHERE assessment_id = $1 AND status = $2
       RETURNING ${ASSESSMENT_COLS}`,
      [assessmentId, before.status],
    )

    const row = (updated.rows as AssessmentRow[])[0]

    if (!row) {
      throw new HiringValidationError(
        'La evaluación cambió de estado mientras la cancelabas. Vuelve a cargarla.',
        'assessment_cancel_stale_state',
        409,
      )
    }

    // Segunda llave (ver el encabezado): libera el slot del LEDGER. Misma transacción que la
    // instancia — o se libera todo, o no se cancela nada. Sin filas afectadas es un no-op
    // legítimo: las instancias del camino legacy (`assignCandidateTest`) no tienen ledger.
    const supersededAssignmentIds = await supersedeAssignmentsForAssessment(
      client,
      assessmentId,
      'operator_cancelled',
    )

    // Payload IDs-only: el outbox sincroniza a BigQuery. NUNCA email, nombre, token, score
    // ni la nota libre (texto de operador puede contener PII).
    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringAssessment,
        aggregateId: assessmentId,
        eventType: EVENT_TYPES.hiringAssessmentCancelled,
        payload: {
          assessmentId,
          applicationId: before.applicationId,
          templateId: before.templateId,
          method: 'candidate_test',
          previousStatus: before.status,
          reasonCode: input.reasonCode,
          hasNote: note != null,
          actorUserId,
          // IDs del ledger liberado: hace auditable en BigQuery que la cancelación soltó el
          // slot de assignment, no sólo el de la instancia. Array vacío = camino legacy.
          supersededAssignmentIds,
        },
      },
      client,
    )

    return { assessment: normalizeAssessment(row), outcome: 'cancelled' as const, previousStatus: before.status }
  })

  // `sent` = el consumer de email ya rotó el token y despachó el link. El ledger de entregas
  // lo confirma sin resolver la dirección del candidato (consulta por entidad, sin PII).
  // En el no-op idempotente el estado previo ya es `cancelled`, así que sólo manda el ledger.
  const linkAlreadyDelivered =
    previousStatus === 'sent' || (await wasEmailDispatchedForEntity(assessmentId, ASSESSMENT_ASSIGNED_EMAIL_TYPE))

  return {
    assessment,
    outcome,
    operatorFollowupRequired: linkAlreadyDelivered,
    followupReason: linkAlreadyDelivered ? 'candidate_link_already_delivered' : null,
  }
}
