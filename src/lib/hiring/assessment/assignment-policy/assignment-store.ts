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
 * Cantidad de asignaciones EFECTIVAS de una policy en su ventana (D5.2). Cuenta sólo
 * `assigned`: un `held`/`blocked` no gastó correo, así que no consume el cap.
 *
 * **NO filtra `superseded_at`, a propósito.** El cap limita CORREOS SALIDOS, no filas vigentes:
 * superseder una asignación no des-envía el correo que el candidato ya recibió. Con el filtro,
 * supersedear liberaba presupuesto retroactivamente y el freno de blast radius dejaba de frenar
 * justo en el escenario que existe para contener.
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
       AND outcome = 'assigned'
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
