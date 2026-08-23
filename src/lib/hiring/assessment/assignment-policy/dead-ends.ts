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
  type AssessmentAssignmentTrigger,
} from '@/types/hiring-assessment-policy'

import { realOnlyPredicate } from '../../data-origin/contracts'
import { HiringValidationError } from '../../errors'

import { RECOVERABLE_ASSIGNMENT_OUTCOMES } from './assignment-store'
import { getPolicyById } from './store'

// TASK-1771 Slice 1 — CALLEJONES del carril automático: filas del ledger que ocupan la clave de
// idempotencia sin haber asignado nada y sin reversa disponible.
//
// Por qué existe este reader: una fila `blocked` del carril automático quema
// `(application, policy, versión, etapa, intento) WHERE superseded_at IS NULL` para siempre. El
// carril manual sale por `attempt_seq + 1` (TASK-1755); el automático NO puede — se lo prohíbe
// `CHECK (origin = 'manual' OR attempt_seq = 1)`. Y hasta acá el estado era INVISIBLE en las tres
// superficies a la vez: `resolveApplicationsAwaitingAssignment` excluye a quien tenga fila
// vigente, la señal `hiring.assessment.assignment_health` es su espejo exacto, y
// `blocked_last_24h` no entra al cálculo de severidad y caduca a las 24 horas. Este reader es lo
// que rompe ese silencio.
//
// ⚠️ Este módulo SÓLO LEE. El write path (estampar `superseded_at`) es el command gobernado del
// Slice 3, con capability, tope y condición de avance.

const str = (v: unknown): string => (v == null ? '' : String(v))
const nstr = (v: unknown): string | null => (v == null ? null : String(v))
const int = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0) || 0)
const ts = (v: unknown): string => (v == null ? '' : v instanceof Date ? v.toISOString() : String(v))

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

/**
 * PREDICADO CANÓNICO DEL CALLEJÓN. Existe UNA sola vez a propósito: la señal de reliability lo
 * importa de acá en vez de reescribirlo en SQL propio (invariante 19 del ADR — una señal cuyo
 * predicado no es el del reader que describe no es una señal, es un silencio).
 *
 * Cada condición carga su razón:
 *
 * - `superseded_at IS NULL` — sólo la fila VIGENTE ocupa la clave. Una superseded ya no estorba.
 * - `origin <> 'manual'` — el carril manual tiene su propia reversa (`attempt_seq + 1`,
 *   TASK-1755) y no está en callejón. Incluirlo mezclaría dos mecanismos distintos.
 * - `outcome = ANY(recuperables)` — `blocked`/`held`/`stale`. La causa vive FUERA del ledger, así
 *   que corregirla puede cambiar el resultado. `assigned`/`already_assigned` ocupan la clave
 *   LEGÍTIMAMENTE y su reversa es la cancelación, que ya existe; `intent` es un FAULT y tiene su
 *   propia métrica.
 * - `policy_version` y `trigger_stage` VIGENTES de la policy — y ésta es la condición que más
 *   fácil se omite. La clave de idempotencia incluye la versión, así que una fila de una versión
 *   anterior **no quema ninguna clave alcanzable**: reconfigurar la policy ya reabrió el paso.
 *   Ofrecerla para supersede sería trabajo sobre algo que no bloquea nada.
 * - `state='enabled' AND mode='on_stage_entry'` — mismo scope que
 *   `resolveApplicationsAwaitingAssignment`, que devuelve `[]` para cualquier otro estado. Con
 *   una policy apagada no hay carril automático que desbloquear.
 *
 * `$1` es SIEMPRE el arreglo de outcomes recuperables.
 */
const DEAD_END_PREDICATE_SQL = `
  asg.superseded_at IS NULL
  AND asg.origin <> 'manual'
  AND asg.outcome = ANY($1::text[])
  AND asg.policy_version = p.policy_version
  AND asg.trigger_stage = p.trigger_stage
  AND p.state = 'enabled'
  AND p.mode = 'on_stage_entry'`

/**
 * Elegibilidad de la POSTULACIÓN, separada del predicado del ledger porque responde otra
 * pregunta: no "¿esta fila quema una clave?" sino "¿esta persona debería recibir una prueba?".
 *
 * Excluye procedencia sintética y postulaciones archivadas, y las dos exclusiones tienen la misma
 * evidencia detrás (2026-08-23): las 4 filas en callejón de la base compartida son
 * `data_origin='smoke_test'` archivadas el 2026-08-19. Desde que `TASK-1748` archiva sellando
 * `archived_at` en vez de escribir `stage='closed'`, esas 4 volvieron a cumplir
 * `stage = trigger_stage`, así que sin este filtro la métrica nueva NACERÍA en 2 y su steady = 0
 * sería inalcanzable el primer día. Una señal que nace amarilla es una señal que nadie vuelve a
 * mirar.
 *
 * La exclusión NUNCA es silenciosa: se cuenta y se reporta aparte (`excludedSynthetic`).
 *
 * La mitad de procedencia sale de `realOnlyPredicate` (TASK-1739), que es el fragmento canónico
 * del dominio: ningún reader escribe su propio WHERE de procedencia. `archived_at` se suma acá
 * porque es el eje que `TASK-1748` separó del de etapa, y responde otra pregunta — no "¿es una
 * persona real?" sino "¿este registro sigue a la vista del operador?".
 */
const REAL_APPLICATION_SQL = `${realOnlyPredicate('app')} AND app.archived_at IS NULL`

/**
 * Recuperaciones YA gastadas de esta clave: filas superseded cuyo outcome sigue siendo
 * recuperable. Las `cancelled` NO cuentan — ésas las supersede el otro mecanismo
 * (`supersedeAssignmentsForAssessment`, que además reescribe el outcome), y sumarlas gastaría el
 * tope de recuperación con actos que no son recuperaciones.
 *
 * Es la derivación del tope anti-bucle, y no necesita columna nueva: el ledger ya la contiene.
 */
const RECOVERY_COUNT_SQL = `
  (SELECT COUNT(*)::int
     FROM greenhouse_hiring.hiring_assessment_assignment prev
    WHERE prev.application_id = asg.application_id
      AND prev.policy_id = asg.policy_id
      AND prev.policy_version = asg.policy_version
      AND prev.trigger_stage = asg.trigger_stage
      AND prev.superseded_at IS NOT NULL
      AND prev.outcome = ANY($1::text[]))`

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

const RECOVERABLE_OUTCOMES_PARAM = [...RECOVERABLE_ASSIGNMENT_OUTCOMES]

export interface AssignmentDeadEnd {
  assignmentId: string
  applicationId: string
  policyId: string
  policyVersion: number
  triggerStage: AssessmentAssignmentTrigger
  attemptSeq: number
  origin: AssessmentAssignmentOrigin
  /** Resultado REGISTRADO. El supersede lo conserva: es la explicación de por qué se bloqueó. */
  outcome: AssessmentAssignmentOutcome
  outcomeReason: AssessmentAssignmentReasonCode | null
  recordedAt: string
  /** Etapa VIGENTE de la postulación (siempre la del trigger, por el predicado). */
  applicationStage: string
  /** Recuperaciones ya gastadas de esta clave. Alimenta el tope anti-bucle del Slice 3. */
  recoveryCount: number
}

export interface AssignmentDeadEndQueue {
  deadEnds: AssignmentDeadEnd[]
  /** Total que cumple el predicado, ANTES del LIMIT. */
  totalMatching: number
  /** `true` cuando el LIMIT cortó. Declarado para que un tope nunca se lea como "no hay más". */
  truncated: boolean
  /** Callejones excluidos por procedencia sintética o archivado. Visible, nunca silencioso. */
  excludedSynthetic: number
}

type DeadEndRow = {
  assignment_id: unknown
  application_id: unknown
  policy_id: unknown
  policy_version: unknown
  trigger_stage: unknown
  attempt_seq: unknown
  origin: unknown
  outcome: unknown
  outcome_reason: unknown
  created_at: unknown
  application_stage: unknown
  recovery_count: unknown
  total_matching: unknown
}

const normalizeDeadEnd = (row: DeadEndRow): AssignmentDeadEnd => ({
  assignmentId: str(row.assignment_id),
  applicationId: str(row.application_id),
  policyId: str(row.policy_id),
  policyVersion: int(row.policy_version),
  triggerStage: assertEnum(row.trigger_stage, ASSESSMENT_ASSIGNMENT_TRIGGERS, 'trigger_stage'),
  attemptSeq: int(row.attempt_seq),
  origin: assertEnum(row.origin, ASSESSMENT_ASSIGNMENT_ORIGINS, 'origin'),
  outcome: assertEnum(row.outcome, ASSESSMENT_ASSIGNMENT_OUTCOMES, 'outcome'),
  outcomeReason: nstr(row.outcome_reason) as AssessmentAssignmentReasonCode | null,
  recordedAt: ts(row.created_at),
  applicationStage: str(row.application_stage),
  recoveryCount: int(row.recovery_count),
})

/**
 * Callejones de UNA policy exacta. Reader scoped: nunca lista global — ésa vive sólo en la señal
 * y devuelve conteos, sin IDs.
 *
 * Devuelve la cola vacía cuando la policy no existe, no está `enabled` o no es `on_stage_entry`,
 * exactamente como `resolveApplicationsAwaitingAssignment`: sin carril automático no hay callejón
 * que desbloquear.
 */
export const resolveAssignmentDeadEndsForPolicy = async (
  policyId: string,
  client: PoolClient | null = null,
  limit = 100,
): Promise<AssignmentDeadEndQueue> => {
  const empty: AssignmentDeadEndQueue = { deadEnds: [], totalMatching: 0, truncated: false, excludedSynthetic: 0 }
  const policy = await getPolicyById(policyId, client)

  if (!policy || policy.state !== 'enabled' || policy.mode !== 'on_stage_entry' || !policy.triggerStage) {
    return empty
  }

  const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)))

  const rows = await runQuery<DeadEndRow>(
    client,
    `SELECT asg.assignment_id, asg.application_id, asg.policy_id, asg.policy_version,
            asg.trigger_stage, asg.attempt_seq, asg.origin, asg.outcome, asg.outcome_reason,
            asg.created_at, app.stage AS application_stage,
            ${RECOVERY_COUNT_SQL} AS recovery_count,
            COUNT(*) OVER ()::int AS total_matching
       FROM greenhouse_hiring.hiring_assessment_assignment asg
       JOIN greenhouse_hiring.hiring_opening_assessment_policy p ON p.policy_id = asg.policy_id
       JOIN greenhouse_hiring.hiring_application app ON app.application_id = asg.application_id
      WHERE p.policy_id = $2
        AND ${DEAD_END_PREDICATE_SQL}
        AND ${REAL_APPLICATION_SQL}
      ORDER BY asg.created_at
      LIMIT $3`,
    [RECOVERABLE_OUTCOMES_PARAM, policy.policyId, safeLimit],
  )

  const excluded = await runQuery<{ total: unknown }>(
    client,
    `SELECT COUNT(*)::int AS total
       FROM greenhouse_hiring.hiring_assessment_assignment asg
       JOIN greenhouse_hiring.hiring_opening_assessment_policy p ON p.policy_id = asg.policy_id
       JOIN greenhouse_hiring.hiring_application app ON app.application_id = asg.application_id
      WHERE p.policy_id = $2
        AND ${DEAD_END_PREDICATE_SQL}
        AND NOT (${REAL_APPLICATION_SQL})`,
    [RECOVERABLE_OUTCOMES_PARAM, policy.policyId],
  )

  const totalMatching = int(rows[0]?.total_matching)

  return {
    deadEnds: rows.map(normalizeDeadEnd),
    totalMatching,
    truncated: totalMatching > rows.length,
    excludedSynthetic: int(excluded[0]?.total),
  }
}

export interface AssignmentDeadEndCounts {
  /** Callejones vigentes sobre postulaciones reales. Steady esperado: 0. */
  deadEnds: number
  /** Excluidos por procedencia sintética o archivado. Evidencia, no alarma. */
  excludedSynthetic: number
}

/**
 * Conteo GLOBAL para la señal de reliability. Sólo números: ningún `applicationId`, ningún
 * `assignmentId`, ninguna PII. Comparte los MISMOS fragmentos de predicado que el reader scoped,
 * que es lo que impide que la señal y la cola se separen con el tiempo.
 */
export const countAssignmentDeadEnds = async (
  client: PoolClient | null = null,
): Promise<AssignmentDeadEndCounts> => {
  const rows = await runQuery<{ dead_ends: unknown; excluded_synthetic: unknown }>(
    client,
    `SELECT
       COUNT(*) FILTER (WHERE ${REAL_APPLICATION_SQL})::int       AS dead_ends,
       COUNT(*) FILTER (WHERE NOT (${REAL_APPLICATION_SQL}))::int AS excluded_synthetic
     FROM greenhouse_hiring.hiring_assessment_assignment asg
     JOIN greenhouse_hiring.hiring_opening_assessment_policy p ON p.policy_id = asg.policy_id
     JOIN greenhouse_hiring.hiring_application app ON app.application_id = asg.application_id
    WHERE ${DEAD_END_PREDICATE_SQL}`,
    [RECOVERABLE_OUTCOMES_PARAM],
  )

  return {
    deadEnds: int(rows[0]?.dead_ends),
    excludedSynthetic: int(rows[0]?.excluded_synthetic),
  }
}
