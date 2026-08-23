import 'server-only'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { HiringNotFoundError, HiringValidationError } from '../../errors'

import { resolveLiveAssignmentIntent } from './assign'
import {
  countRecoveryAttemptsForKey,
  isRecoverableAssignmentOutcome,
  lockAssignmentForUpdate,
  supersedeRecoverableAssignment,
} from './assignment-store'
import { DEAD_END_RECOVERY_CAP } from './dead-ends'
import { lockPolicyForUpdate } from './store'

/**
 * TASK-1771 Slice 3 — COMMAND GOBERNADO que libera la clave de idempotencia de una fila en
 * callejón del carril automático.
 *
 * El carril manual recupera abriendo un casillero nuevo (`attempt_seq + 1`, TASK-1755). El
 * automático no puede: se lo prohíbe `CHECK (origin = 'manual' OR attempt_seq = 1)`, y su reversa
 * declarada —`superseded_at` por reconciliación— no tenía write path. Éste es ese write path.
 *
 * **Lo que este command NO hace, y es tan importante como lo que hace:**
 *
 * - **No manda ningún correo ni crea ninguna instancia.** Sólo devuelve la fila al conjunto que
 *   `resolveApplicationsAwaitingAssignment` ve. El intento nuevo sale del camino gobernado de
 *   siempre (propose → confirm humano, o el próximo stage event) y es ESE camino el que decide la
 *   comunicación al candidato — el invariante «ni cero ni dos correos» sigue viviendo donde
 *   siempre vivió.
 * - **No reescribe `outcome` ni `outcome_reason`.** El intento se bloqueó por `volume_cap`; eso
 *   pasó y sigue siendo verdad. Lo único que deja de ser verdad es que esa fila tenga que ocupar
 *   la clave para siempre.
 * - **No relaja el límite de autoridad del ADR D2 capa 3.** El carril automático sigue escribiendo
 *   `attempt_seq = 1` y nada más; lo que cambia es que su casillero puede vaciarse.
 * - **No libera presupuesto del cap de volumen.** `countAssignedInWindow` no filtra
 *   `superseded_at` a propósito: el cap mide CORREOS SALIDOS, y superseder no des-envía nada.
 *
 * **Dos frenos, en el mismo slice que el command.** Sin ellos esto es una fábrica de filas:
 *
 * 1. **Condición de avance:** sólo se supersede si la evaluación viva resuelve `assigned`. NO
 *    basta con que difiera del resultado registrado — verificado contra PostgreSQL el 2026-08-23,
 *    hay filas que dicen `volume_cap` y hoy evaluarían `policy_disabled`: con el criterio laxo el
 *    command las liberaría para volver a quemar la clave con otra razón, que es el bucle con otro
 *    nombre. Y peor: cada ciclo inútil gasta una de las tres recuperaciones del tope, así que el
 *    criterio laxo consume el presupuesto de la persona a la que dice ayudar.
 * 2. **Tope por clave** (`DEAD_END_RECOVERY_CAP`), derivado del ledger. Al agotarse, la clave
 *    exige intervención humana — mismo espíritu que el `dead_letter` del outbox.
 *
 * La procedencia (`data_origin`) **no** entra acá, y es deliberado: gobierna qué se MUESTRA en la
 * cola y qué ALARMA en la señal, nunca qué puede hacer un humano autorizado sobre una fila
 * concreta. Es el mismo criterio con que el dominio decide que retención y cumplimiento son ciegos
 * a la procedencia.
 */

export interface SupersedeAssignmentDeadEndInput {
  assignmentId: string
  /** Vacante desde la que se opera. El command verifica que la fila le pertenezca. */
  openingId: string
  /** NUNCA vacío: un supersede sin actor no es gobernado. */
  actorUserId: string
}

export type SupersedeAssignmentDeadEndResult =
  | {
      status: 'superseded'
      assignmentId: string
      applicationId: string
      /** Recuperaciones gastadas DESPUÉS de ésta. */
      recoveryCount: number
      remainingRecoveries: number
    }
  | {
      /** Idempotencia: la fila ya estaba superseded. No es error y no vuelve a publicar evento. */
      status: 'already_superseded'
      assignmentId: string
      applicationId: string
    }

const trimmed = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

export const supersedeAssignmentDeadEnd = async (
  input: SupersedeAssignmentDeadEndInput,
  txClient: PoolClient | null = null,
): Promise<SupersedeAssignmentDeadEndResult> => {
  const assignmentId = trimmed(input.assignmentId)
  const openingId = trimmed(input.openingId)
  const actorUserId = trimmed(input.actorUserId)

  if (!assignmentId || !openingId) {
    throw new HiringValidationError(
      'assignmentId y openingId son obligatorios.',
      'assessment_assignment_supersede_field_required',
      400,
    )
  }

  // Un supersede sin actor no se puede auditar, y auditarlo es la mitad de por qué existe. El
  // caller automático (`assignAssessmentFromPolicy` desde el consumer reactivo del ops-worker)
  // corre con `actorUserId: null`, así que esta guarda es además la que impide que alguien
  // enchufe este command a ese carril sin darse cuenta.
  if (!actorUserId) {
    throw new HiringValidationError(
      'El supersede requiere un actor humano identificado.',
      'assessment_assignment_supersede_actor_required',
      400,
    )
  }

  const execute = async (client: PoolClient): Promise<SupersedeAssignmentDeadEndResult> => {
    // Primera lectura SÓLO para resolver a qué policy pertenece la fila. El orden de locks del
    // dominio es policy → ledger (el mismo que toma `assignAssessmentFromPolicy`); invertirlo acá
    // sería la receta del deadlock, así que la fila se re-lee después del lock de policy.
    const preview = await lockAssignmentForUpdate(client, assignmentId)

    if (!preview) {
      throw new HiringNotFoundError('La asignación no existe.', 'assessment_assignment_not_found')
    }

    const policy = await lockPolicyForUpdate(client, preview.policyId)

    if (policy.openingId !== openingId) {
      // 404 y no 403: un 403 le confirmaría a quien esté sondeando que la fila existe. La
      // distinción vive en el log interno, sin PII.
      throw new HiringNotFoundError('La asignación no existe.', 'assessment_assignment_not_found')
    }

    const assignment = await lockAssignmentForUpdate(client, assignmentId)

    if (!assignment) {
      throw new HiringNotFoundError('La asignación no existe.', 'assessment_assignment_not_found')
    }

    if (assignment.supersededAt) {
      return { status: 'already_superseded', assignmentId, applicationId: assignment.applicationId }
    }

    if (assignment.origin === 'manual') {
      throw new HiringValidationError(
        'El carril manual se recupera con un intento nuevo, no liberando su clave.',
        'assessment_assignment_supersede_manual_lane',
        409,
      )
    }

    if (!isRecoverableAssignmentOutcome(assignment.outcome)) {
      throw new HiringValidationError(
        'Esa asignación no está en callejón: su clave está ocupada legítimamente.',
        'assessment_assignment_supersede_not_recoverable',
        409,
        { outcome: assignment.outcome },
      )
    }

    if (policy.state !== 'enabled' || policy.mode !== 'on_stage_entry') {
      throw new HiringValidationError(
        'La policy de la vacante no tiene la asignación automática activa.',
        'assessment_assignment_supersede_policy_inactive',
        409,
      )
    }

    // Una fila de una versión o etapa anterior NO bloquea ninguna clave alcanzable: la clave de
    // idempotencia incluye `policy_version`, así que reconfigurar la policy ya reabrió el paso.
    // Superseder acá sería trabajo sobre algo que no estorba.
    if (assignment.policyVersion !== policy.policyVersion || assignment.triggerStage !== policy.triggerStage) {
      throw new HiringValidationError(
        'Esa asignación ya no bloquea nada: la policy cambió de versión o de etapa.',
        'assessment_assignment_supersede_stale_key',
        409,
      )
    }

    const recoveryCount = await countRecoveryAttemptsForKey(client, {
      applicationId: assignment.applicationId,
      policyId: assignment.policyId,
      policyVersion: assignment.policyVersion,
      triggerStage: assignment.triggerStage,
    })

    if (recoveryCount >= DEAD_END_RECOVERY_CAP) {
      throw new HiringValidationError(
        'Esa asignación agotó sus recuperaciones y necesita revisión humana.',
        'assessment_assignment_supersede_cap_reached',
        409,
        { recoveryCount, cap: DEAD_END_RECOVERY_CAP },
      )
    }

    // CONDICIÓN DE AVANCE. Se evalúa acá, bajo el `FOR UPDATE` de la policy y en el mismo instante
    // del write, y NO se reusa la evaluación que la cola mostró: `volume_cap` se auto-cura con una
    // ventana MÓVIL, así que la foto de la pantalla puede haber caducado entre el clic y esto.
    const live = await resolveLiveAssignmentIntent(
      client,
      policy,
      assignment.applicationId,
      assignment.origin,
      assignment.triggerStage,
    )

    if (live.outcome !== 'assigned') {
      throw new HiringValidationError(
        'La causa del bloqueo sigue vigente: liberar la clave ahora volvería a bloquear la asignación.',
        'assessment_assignment_supersede_cause_still_blocking',
        409,
        { liveOutcome: live.outcome, liveReason: live.reasonCode },
      )
    }

    const superseded = await supersedeRecoverableAssignment(client, assignmentId)

    if (!superseded) {
      // Carrera perdida contra otro supersede de la misma fila. No es error: el efecto deseado ya
      // ocurrió, y publicar un segundo evento duplicaría la historia.
      return { status: 'already_superseded', assignmentId, applicationId: assignment.applicationId }
    }

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringAssessmentAssignment,
        aggregateId: assignmentId,
        eventType: EVENT_TYPES.hiringAssessmentAssignmentSuperseded,
        // IDs-only: nunca nombre, correo, token ni score. `recordedReason` es un reason code
        // estable del enum, y conservarlo es justamente lo que deja auditable la decisión.
        payload: {
          assignmentId,
          applicationId: assignment.applicationId,
          policyId: policy.policyId,
          policyVersion: policy.policyVersion,
          openingId: policy.openingId,
          origin: assignment.origin,
          triggerStage: assignment.triggerStage,
          attemptSeq: assignment.attemptSeq,
          recordedOutcome: assignment.outcome,
          recordedReason: assignment.outcomeReason,
          recoveryCount: recoveryCount + 1,
          actorUserId,
        },
      },
      client,
    )

    return {
      status: 'superseded',
      assignmentId,
      applicationId: assignment.applicationId,
      recoveryCount: recoveryCount + 1,
      remainingRecoveries: DEAD_END_RECOVERY_CAP - (recoveryCount + 1),
    }
  }

  if (txClient) return execute(txClient)

  return withGreenhousePostgresTransaction(execute)
}
