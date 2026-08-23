import 'server-only'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  ASSESSMENT_ASSIGNMENT_ORIGINS,
  ASSESSMENT_ASSIGNMENT_OUTCOMES,
  ASSESSMENT_ASSIGNMENT_TRIGGERS,
  type AssessmentAssignmentOrigin,
  type AssessmentAssignmentOutcome,
  type AssessmentAssignmentReasonCode,
  type AssessmentAssignmentRecord,
  type AssessmentAssignmentTrigger,
} from '@/types/hiring-assessment-policy'

import { HiringValidationError } from '../../errors'

// TASK-1719 Slice 2 — Ledger del assignment. ADR D2 capa 1 (UNIQUE parcial) + capa 2
// (`ON CONFLICT DO NOTHING RETURNING` + re-lectura del ganador, SIN excepción).

const runQuery = async <T extends Record<string, unknown>>(
  client: PoolClient | null,
  text: string,
  values: unknown[],
): Promise<T[]> => {
  if (client) {
    const result = await client.query(text, values)

    return result.rows as T[]
  }

  return runGreenhousePostgresQuery<T>(text, values)
}

const str = (v: unknown): string => (v == null ? '' : String(v))
const nstr = (v: unknown): string | null => (v == null ? null : String(v))
const ts = (v: unknown): string | null => (v == null ? null : v instanceof Date ? v.toISOString() : String(v))
const int = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0) || 0)

const assertEnum = <T extends string>(v: unknown, allowed: readonly T[], field: string): T => {
  if (typeof v !== 'string' || !allowed.includes(v as T)) {
    throw new HiringValidationError(
      `El valor de ${field} del assignment no es válido.`,
      'assessment_assignment_invalid_enum',
      500,
      { field },
    )
  }

  return v as T
}

type AssignmentRow = {
  assignment_id: unknown
  application_id: unknown
  policy_id: unknown
  assessment_id: unknown
  policy_version: unknown
  trigger_stage: unknown
  attempt_seq: unknown
  origin: unknown
  outcome: unknown
  outcome_reason: unknown
  superseded_at: unknown
  actor_user_id: unknown
  created_at: unknown
  updated_at: unknown
}

const ASSIGNMENT_COLS = `
  assignment_id, application_id, policy_id, assessment_id, policy_version, trigger_stage,
  attempt_seq, origin, outcome, outcome_reason, superseded_at, actor_user_id,
  created_at, updated_at`

const normalizeAssignment = (row: AssignmentRow): AssessmentAssignmentRecord => ({
  assignmentId: str(row.assignment_id),
  applicationId: str(row.application_id),
  policyId: str(row.policy_id),
  assessmentId: nstr(row.assessment_id),
  policyVersion: int(row.policy_version),
  triggerStage: assertEnum(row.trigger_stage, ASSESSMENT_ASSIGNMENT_TRIGGERS, 'trigger_stage'),
  attemptSeq: int(row.attempt_seq),
  origin: assertEnum(row.origin, ASSESSMENT_ASSIGNMENT_ORIGINS, 'origin'),
  outcome: assertEnum(row.outcome, ASSESSMENT_ASSIGNMENT_OUTCOMES, 'outcome'),
  outcomeReason: nstr(row.outcome_reason) as AssessmentAssignmentReasonCode | null,
  supersededAt: ts(row.superseded_at),
  actorUserId: nstr(row.actor_user_id),
  createdAt: ts(row.created_at) ?? '',
  updatedAt: ts(row.updated_at) ?? '',
})

export interface AssignmentKey {
  applicationId: string
  policyId: string
  policyVersion: number
  triggerStage: AssessmentAssignmentTrigger
  attemptSeq: number
}

/** Intento VIGENTE (no superseded) para la clave de idempotencia — la base de la capa 1. */
export const findActiveAssignment = async (
  key: AssignmentKey,
  client: PoolClient | null = null,
): Promise<AssessmentAssignmentRecord | null> => {
  const rows = await runQuery<AssignmentRow>(
    client,
    `SELECT ${ASSIGNMENT_COLS} FROM greenhouse_hiring.hiring_assessment_assignment
     WHERE application_id = $1 AND policy_id = $2 AND policy_version = $3
       AND trigger_stage = $4 AND attempt_seq = $5 AND superseded_at IS NULL
     LIMIT 1`,
    [key.applicationId, key.policyId, key.policyVersion, key.triggerStage, key.attemptSeq],
  )

  return rows[0] ? normalizeAssignment(rows[0]) : null
}

/**
 * TASK-1755 — Resultados de intento que NO cerraron la puerta. La causa vive FUERA del ledger
 * (la policy en `draft`, la plantilla inactiva, el correo sin registrar), así que corregirla
 * puede cambiar el resultado del intento siguiente. `assigned`/`already_assigned` no están acá
 * a propósito: esa clave está legítimamente ocupada y su reversa es la cancelación, no un
 * reintento. `intent` tampoco: una fila a medio escribir es un FAULT, y abrirle un intento
 * nuevo taparía el bug en vez de delatarlo.
 */
export const RECOVERABLE_ASSIGNMENT_OUTCOMES = ['blocked', 'held', 'stale'] as const

export const isRecoverableAssignmentOutcome = (outcome: AssessmentAssignmentOutcome): boolean =>
  (RECOVERABLE_ASSIGNMENT_OUTCOMES as readonly string[]).includes(outcome)

export interface AssignmentAttemptState {
  /** Mayor `attempt_seq` jamás escrito para la clave, superseded incluido. 0 si no hay historia. */
  maxAttemptSeq: number
  /** Intento VIGENTE más alto. `null` cuando ninguno lo está (p.ej. todos cancelados). */
  latestActive: { attemptSeq: number; outcome: AssessmentAssignmentOutcome } | null
}

/**
 * TASK-1755 — Estado de los intentos de una clave SIN fijar `attempt_seq`: qué número se usó
 * más alto (para que el siguiente sea monotónico y nunca reuse el rótulo de un intento
 * superseded) y cuál es el intento vigente más alto con su resultado (para decidir si la
 * puerta está cerrada o si el mundo puede haberse corregido).
 *
 * **El caller DEBE tener la fila de policy bloqueada (`FOR UPDATE`) antes de llamar**, igual
 * que `countAssignedInWindow`: sin eso dos confirmaciones concurrentes leen el mismo estado y
 * resuelven el mismo intento. Con el lock, la carrera queda ordenada; la capa 2 del ADR D2
 * (`ON CONFLICT DO NOTHING` + re-lectura) sigue siendo la red por debajo.
 *
 * Devuelve las filas crudas y agrega en TS a propósito: una clave real tiene uno o dos
 * intentos, y un `MAX(...) FILTER (...)` acá sería SQL más difícil de leer sin ganar nada.
 */
export const readAssignmentAttemptState = async (
  client: PoolClient,
  key: Omit<AssignmentKey, 'attemptSeq'>,
): Promise<AssignmentAttemptState> => {
  const rows = await runQuery<{ attempt_seq: unknown; outcome: unknown; superseded_at: unknown }>(
    client,
    `SELECT attempt_seq, outcome, superseded_at
     FROM greenhouse_hiring.hiring_assessment_assignment
     WHERE application_id = $1 AND policy_id = $2 AND policy_version = $3 AND trigger_stage = $4
     ORDER BY attempt_seq DESC`,
    [key.applicationId, key.policyId, key.policyVersion, key.triggerStage],
  )

  const active = rows.find(row => row.superseded_at == null)

  return {
    maxAttemptSeq: rows.reduce((max, row) => Math.max(max, int(row.attempt_seq)), 0),
    latestActive: active
      ? {
          attemptSeq: int(active.attempt_seq),
          outcome: assertEnum(active.outcome, ASSESSMENT_ASSIGNMENT_OUTCOMES, 'outcome'),
        }
      : null,
  }
}

export interface RecordAssignmentInput extends AssignmentKey {
  origin: AssessmentAssignmentOrigin
  outcome: AssessmentAssignmentOutcome
  outcomeReason: AssessmentAssignmentReasonCode | null
  assessmentId: string | null
  actorUserId: string | null
}

/**
 * Escribe el intento en el ledger. Carrera del índice único parcial (dos stage events o dos
 * confirmaciones concurrentes) → devuelve el ganador con `created=false`, SIN excepción: el
 * caller NO ejecuta side effects en esa rama (ni instancia, ni evento, ni correo).
 */
export const recordAssignment = async (
  client: PoolClient,
  input: RecordAssignmentInput,
): Promise<{ assignment: AssessmentAssignmentRecord; created: boolean }> => {
  const rows = await runQuery<AssignmentRow>(
    client,
    `INSERT INTO greenhouse_hiring.hiring_assessment_assignment
       (application_id, policy_id, assessment_id, policy_version, trigger_stage,
        attempt_seq, origin, outcome, outcome_reason, actor_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (application_id, policy_id, policy_version, trigger_stage, attempt_seq)
       WHERE superseded_at IS NULL
     DO NOTHING
     RETURNING ${ASSIGNMENT_COLS}`,
    [
      input.applicationId,
      input.policyId,
      input.assessmentId,
      input.policyVersion,
      input.triggerStage,
      input.attemptSeq,
      input.origin,
      input.outcome,
      input.outcomeReason,
      input.actorUserId,
    ],
  )

  if (rows[0]) {
    return { assignment: normalizeAssignment(rows[0]), created: true }
  }

  const winner = await findActiveAssignment(input, client)

  if (!winner) {
    throw new HiringValidationError(
      'No se pudo registrar la asignación de la evaluación.',
      'assessment_assignment_conflict',
      409,
    )
  }

  return { assignment: winner, created: false }
}

/**
 * Cierra la fila con su instancia (y corrige el outcome cuando la instancia ya existía).
 * SIEMPRE dentro de la misma transacción del command.
 */
export const attachAssignmentInstance = async (
  client: PoolClient,
  assignmentId: string,
  input: { assessmentId: string; outcome: AssessmentAssignmentOutcome; outcomeReason: AssessmentAssignmentReasonCode | null },
): Promise<AssessmentAssignmentRecord> => {
  const rows = await runQuery<AssignmentRow>(
    client,
    `UPDATE greenhouse_hiring.hiring_assessment_assignment
       SET assessment_id = $2, outcome = $3, outcome_reason = $4, updated_at = NOW()
     WHERE assignment_id = $1
     RETURNING ${ASSIGNMENT_COLS}`,
    [assignmentId, input.assessmentId, input.outcome, input.outcomeReason],
  )

  // 0 filas = el assignment desapareció entre el INSERT y el cierre (imposible dentro de la
  // misma transacción, así que si pasa es un bug). Sin este guardia, `normalizeAssignment`
  // recibía `undefined` y reventaba con un TypeError opaco en vez de decir qué falló.
  if (!rows[0]) {
    throw new HiringValidationError(
      'No se pudo cerrar la asignación de la evaluación.',
      'assessment_assignment_attach_failed',
      500,
      { assignmentId },
    )
  }

  return normalizeAssignment(rows[0])
}

/**
 * SUPERSEDE de la(s) fila(s) vigentes que apuntan a una instancia que acaba de morir.
 *
 * ⚠️ Es la mitad del ledger de la cancelación, y sin ella cancelar NO libera nada. El índice
 * `hiring_assessment_open_instance_unique_idx` y el índice del ledger son llaves DISTINTAS:
 * `cancelled` sale del primero (por eso se podía crear otra instancia), pero la fila del ledger
 * seguía `outcome='assigned'`, `superseded_at IS NULL` y apuntando a la instancia muerta. La
 * consecuencia observable era que re-asignar por el command gobernado devolvía `already_assigned`
 * **con el assessmentId cancelado** (ruta 200, sin correo), y en el carril automático `decide.ts`
 * leía ese `assigned` y CALLABA: candidato movido de etapa, prueba cancelada, cero comunicación.
 *
 * Va SIEMPRE en la misma transacción que cancela la instancia: dos writes, un solo hecho.
 *
 * Cero filas afectadas NO es error: las instancias creadas por el camino legacy
 * (`assignCandidateTest`, el route manual pre-policy) nunca tuvieron fila de ledger. Es un no-op
 * legítimo y silencioso — el caller no debe tratarlo como fallo.
 */
export const supersedeAssignmentsForAssessment = async (
  client: PoolClient,
  assessmentId: string,
  outcomeReason: AssessmentAssignmentReasonCode,
): Promise<string[]> => {
  const rows = await runQuery<{ assignment_id: unknown }>(
    client,
    `UPDATE greenhouse_hiring.hiring_assessment_assignment
       SET superseded_at = NOW(), outcome = 'cancelled', outcome_reason = $2, updated_at = NOW()
     WHERE assessment_id = $1 AND superseded_at IS NULL
     RETURNING assignment_id`,
    [assessmentId, outcomeReason],
  )

  return rows.map(row => str(row.assignment_id))
}


/**
 * TASK-1771 — Fila EXACTA del ledger bajo `FOR UPDATE`. El caller DEBE haber bloqueado antes la
 * fila de policy: ése es el orden de locks del dominio (policy → ledger) y respetarlo es lo que
 * evita el deadlock contra `assignAssessmentFromPolicy`, que toma los mismos dos en ese orden.
 */
export const lockAssignmentForUpdate = async (
  client: PoolClient,
  assignmentId: string,
): Promise<AssessmentAssignmentRecord | null> => {
  const rows = await runQuery<AssignmentRow>(
    client,
    `SELECT ${ASSIGNMENT_COLS} FROM greenhouse_hiring.hiring_assessment_assignment
     WHERE assignment_id = $1 FOR UPDATE`,
    [assignmentId],
  )

  return rows[0] ? normalizeAssignment(rows[0]) : null
}

/**
 * TASK-1771 — Recuperaciones YA gastadas por una clave: filas superseded cuyo outcome sigue siendo
 * recuperable. Es la derivación del tope anti-bucle, y no necesitó columna nueva porque el ledger
 * ya la contiene.
 *
 * Las `cancelled` NO cuentan a propósito: ésas las escribe `supersedeAssignmentsForAssessment`
 * —el otro mecanismo, el de la instancia que murió— y sumarlas gastaría el presupuesto de
 * recuperación con actos que no son recuperaciones.
 *
 * **Es EL concepto de tope, no el del carril automático.** El carril manual no tiene techo hoy
 * (`resolveAttemptSeq` devuelve `maxAttemptSeq + 1` sin límite) y cuando se le ponga uno, sale de
 * acá contando por `attempt_seq` en vez de por supersede. Se deja escrito para que el próximo no
 * derive una segunda definición del mismo concepto.
 */
export const countRecoveryAttemptsForKey = async (
  client: PoolClient,
  key: Omit<AssignmentKey, 'attemptSeq'>,
): Promise<number> => {
  const rows = await runQuery<{ total: unknown }>(
    client,
    `SELECT COUNT(*)::int AS total FROM greenhouse_hiring.hiring_assessment_assignment
     WHERE application_id = $1 AND policy_id = $2 AND policy_version = $3 AND trigger_stage = $4
       AND superseded_at IS NOT NULL
       AND outcome = ANY($5::text[])`,
    [key.applicationId, key.policyId, key.policyVersion, key.triggerStage, [...RECOVERABLE_ASSIGNMENT_OUTCOMES]],
  )

  return int(rows[0]?.total)
}

/**
 * TASK-1771 — LIBERA la clave de idempotencia de una fila en callejón, y NADA MÁS.
 *
 * ⚠️ **Estampa `superseded_at` y CONSERVA `outcome` y `outcome_reason`.** Es la diferencia dura
 * con `supersedeAssignmentsForAssessment`, que sí reescribe a `cancelled` — y ahí hace bien,
 * porque el hecho cambió (la instancia murió). Acá el hecho NO cambia: el intento se bloqueó por
 * `volume_cap`, eso pasó y sigue siendo cierto; lo único que deja de ser cierto es que esa fila
 * tenga que ocupar la clave para siempre. Reescribir el outcome borraría la explicación de por qué
 * se bloqueó, que es todo el valor de auditoría de la fila.
 *
 * Devuelve `false` cuando la fila ya estaba superseded: el `WHERE superseded_at IS NULL` lo
 * convierte en un no-op observable en vez de un doble efecto.
 */
export const supersedeRecoverableAssignment = async (
  client: PoolClient,
  assignmentId: string,
): Promise<boolean> => {
  const rows = await runQuery<{ assignment_id: unknown }>(
    client,
    `UPDATE greenhouse_hiring.hiring_assessment_assignment
       SET superseded_at = NOW(), updated_at = NOW()
     WHERE assignment_id = $1 AND superseded_at IS NULL
     RETURNING assignment_id`,
    [assignmentId],
  )

  return rows.length > 0
}

/**
 * Cantidad de asignaciones EFECTIVAS de una policy en su ventana (D5.2). Un `held`/`blocked`
 * no gastó correo, así que no consume el cap.
 *
 * **NO filtra `superseded_at`, a propósito.** El cap limita CORREOS SALIDOS, no filas vigentes:
 * superseder una asignación no des-envía el correo que el candidato ya recibió. Con el filtro,
 * supersedear liberaba presupuesto retroactivamente y el freno de blast radius dejaba de frenar
 * justo en el escenario que existe para contener.
 *
 * ⚠️ Por la MISMA razón cuenta también `cancelled: operator_cancelled`: desde que
 * `supersedeAssignmentsForAssessment` reescribe `assigned → cancelled`, contar sólo `assigned`
 * habría dejado que cancelar liberara presupuesto del cap — exactamente el agujero que el
 * párrafo anterior existe para cerrar. El par (outcome, reason) lo escribe SÓLO el path de
 * cancelación, así que el predicado no sobre-cuenta nada más.
 *
 * El caller DEBE tener la fila de policy bloqueada (`FOR UPDATE`) antes de llamar: sin eso, dos
 * assignments concurrentes leen el mismo conteo y pasan los dos.
 */
export const countAssignedInWindow = async (
  client: PoolClient | null,
  policyId: string,
  windowMinutes: number,
): Promise<number> => {
  const rows = await runQuery<{ total: unknown }>(
    client,
    `SELECT COUNT(*)::int AS total FROM greenhouse_hiring.hiring_assessment_assignment
     WHERE policy_id = $1
       AND (outcome = 'assigned' OR (outcome = 'cancelled' AND outcome_reason = 'operator_cancelled'))
       AND created_at > NOW() - make_interval(mins => $2)`,
    [policyId, Math.max(1, Math.floor(windowMinutes))],
  )

  return int(rows[0]?.total)
}

/** Asignaciones vigentes de una postulación exacta (reader scoped, nunca lista global). */
export const listAssignmentsForApplication = async (
  applicationId: string,
  client: PoolClient | null = null,
): Promise<AssessmentAssignmentRecord[]> => {
  const rows = await runQuery<AssignmentRow>(
    client,
    `SELECT ${ASSIGNMENT_COLS} FROM greenhouse_hiring.hiring_assessment_assignment
     WHERE application_id = $1 ORDER BY created_at DESC`,
    [applicationId],
  )

  return rows.map(normalizeAssignment)
}
