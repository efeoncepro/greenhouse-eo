import 'server-only'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { HiringValidationError } from '../errors'
import { DATA_ORIGIN_REASON_MIN } from './mark'

/**
 * TASK-1739 Slice 5 — Purga gobernada de datos sintéticos: **archivar por defecto, borrar por excepción**.
 *
 * La hipótesis "archivar lo que tiene historia, borrar sólo los huérfanos" está respaldada por el
 * esquema real, no por preferencia estética:
 * - `hiring_assessment.application_id` es **ON DELETE CASCADE**: borrar una postulación se lleva por
 *   delante, EN SILENCIO, sus assessments, respuestas, runs de scoring e items. Si alguna respuesta
 *   fue calificada por una persona, se destruye trabajo humano irrecuperable. Eso solo descalifica el
 *   DELETE como lane por defecto.
 * - `asset_scan_results` tiene trigger `RAISE EXCEPTION` en DELETE y cascadea desde `assets`.
 * - Las FKs de `hiring_application` hacia persona, ficha y vacante son **ON DELETE RESTRICT**: el
 *   borrado de una persona con postulaciones falla en la base, como debe ser.
 *
 * Por eso Lane A (archivado) cubre casi todo y es reversible, y Lane B (borrado) es una excepción
 * estrecha que **aborta la corrida COMPLETA** si una sola fila no califica — nunca "casi todo".
 */

export type PurgeLane = 'archive' | 'delete'

export interface PurgeCandidate {
  applicationId: string
  openingId: string
  dataOrigin: string
  stage: string
  /** Dependientes que impiden el borrado. Vacío ⇒ la fila califica para Lane B. */
  deleteBlockers: string[]
}

export interface PurgePlan {
  generatedAt: string
  candidates: PurgeCandidate[]
}

/**
 * Los NUEVE dependientes reales de `hiring_application`, verificados contra PG (2026-08-18). La spec
 * original enumeraba cinco condiciones genéricas y se perdía cuatro tablas: el DELETE habría fallado
 * loud igual (todas son RESTRICT salvo assessment, que cascadea), pero el preflight habría mentido
 * diciendo que la fila calificaba.
 */
const DELETE_BLOCKER_PROBES: { table: string; column: string; label: string }[] = [
  { table: 'greenhouse_hiring.hiring_assessment', column: 'application_id', label: 'assessment (CASCADE: destruiría respuestas)' },
  { table: 'greenhouse_hiring.hiring_application_note', column: 'application_id', label: 'notas del expediente' },
  { table: 'greenhouse_hiring.hiring_application_dossier_proposal', column: 'application_id', label: 'propuesta de dossier' },
  { table: 'greenhouse_hiring.hiring_assessment_ai_scoring_run', column: 'application_id', label: 'run de scoring IA' },
  { table: 'greenhouse_hiring.hiring_assessment_ai_scoring_run_item', column: 'application_id', label: 'item de scoring IA' },
  { table: 'greenhouse_hiring.candidate_identity_intake_evidence', column: 'application_id', label: 'evidencia de identidad (append-only)' },
  { table: 'greenhouse_hiring.candidate_identity_display_audit', column: 'application_id', label: 'audit de display (append-only)' },
  { table: 'greenhouse_hiring.hiring_assessment_assignment', column: 'application_id', label: 'asignación de assessment' },
  { table: 'greenhouse_hiring.hiring_assessment_assignment_proposal', column: 'application_id', label: 'propuesta de asignación' },
  { table: 'greenhouse_hiring.hiring_handoff', column: 'hiring_application_id', label: 'handoff' },
]

const loadDeleteBlockers = async (applicationIds: string[]): Promise<Map<string, string[]>> => {
  const byApplication = new Map<string, string[]>()

  if (applicationIds.length === 0) return byApplication

  for (const probe of DELETE_BLOCKER_PROBES) {
    const rows = await runGreenhousePostgresQuery<{ application_id: string }>(
      `SELECT DISTINCT ${probe.column} AS application_id FROM ${probe.table} WHERE ${probe.column} = ANY($1::text[])`,
      [applicationIds],
    ).catch(() => [])

    for (const row of rows) {
      byApplication.set(row.application_id, [...(byApplication.get(row.application_id) ?? []), probe.label])
    }
  }

  return byApplication
}

/** Plan READ-ONLY sobre postulaciones ya marcadas como no reales. No infiere por nombre jamás. */
export const planSyntheticPurge = async (): Promise<PurgePlan> => {
  const rows = await runGreenhousePostgresQuery<{
    application_id: string
    opening_id: string
    data_origin: string
    stage: string
  }>(
    `SELECT application_id, opening_id, data_origin, stage
       FROM greenhouse_hiring.hiring_application
      WHERE data_origin <> 'real'
      ORDER BY created_at`,
  )

  const blockers = await loadDeleteBlockers(rows.map(r => r.application_id))

  return {
    generatedAt: new Date().toISOString(),
    candidates: rows.map(row => ({
      applicationId: row.application_id,
      openingId: row.opening_id,
      dataOrigin: row.data_origin,
      stage: row.stage,
      deleteBlockers: blockers.get(row.application_id) ?? [],
    })),
  }
}

export interface ApplyPurgeInput {
  lane: PurgeLane
  applicationIds: string[]
  actorUserId: string
  reason: string
}

export interface PurgeEntryResult {
  applicationId: string
  outcome: 'archived' | 'deleted' | 'skipped'
  reasonCode?: 'not_synthetic' | 'already_archived' | 'not_found'
}

export interface ApplyPurgeSummary {
  lane: PurgeLane
  processed: number
  results: PurgeEntryResult[]
}

const assertActorAndReason = (actorUserId: string, reason: string): void => {
  if (!actorUserId.trim()) throw new HiringValidationError('Falta el actor de la purga.', 'hiring_invalid_input', 400)

  if (reason.trim().length < DATA_ORIGIN_REASON_MIN) {
    throw new HiringValidationError(
      `El motivo de la purga debe tener al menos ${DATA_ORIGIN_REASON_MIN} caracteres.`,
      'hiring_invalid_input',
      400,
    )
  }
}

/**
 * Lane A — Archivado. Reversible, preserva TODA la auditoría. Es lo que se aplica a cualquier
 * registro con dependientes auditables, o sea a casi todo.
 *
 * ⚠️ Deuda declarada: archivar mueve `stage` a `closed` pero NO setea `decision`, y el reader de
 * retención (`documents/retention.ts`) se guarda con `decision IS NULL`. Para un sujeto sintético eso
 * es inocuo. Para una persona REAL que hubiese heredado no-real por su vacante, congelaría su reloj
 * de retención — por eso `TASK-1744` lo declara como precondición y esta función se limita a lo
 * sintético.
 */
export const archiveSyntheticRecords = async (input: ApplyPurgeInput): Promise<ApplyPurgeSummary> => {
  assertActorAndReason(input.actorUserId, input.reason)

  const results: PurgeEntryResult[] = []

  for (const applicationId of input.applicationIds) {
    const result = await withGreenhousePostgresTransaction(async client => {
      const current = await client.query(
        `SELECT data_origin, stage FROM greenhouse_hiring.hiring_application WHERE application_id = $1 FOR UPDATE`,
        [applicationId],
      )

      const row = current.rows[0] as { data_origin: string; stage: string } | undefined

      if (!row) return { applicationId, outcome: 'skipped' as const, reasonCode: 'not_found' as const }

      // Nunca se archiva un dato real por esta vía: la puerta es la procedencia, no el criterio del operador.
      if (row.data_origin === 'real') {
        return { applicationId, outcome: 'skipped' as const, reasonCode: 'not_synthetic' as const }
      }

      if (row.stage === 'closed') {
        return { applicationId, outcome: 'skipped' as const, reasonCode: 'already_archived' as const }
      }

      await client.query(`UPDATE greenhouse_hiring.hiring_application SET stage = 'closed' WHERE application_id = $1`, [
        applicationId,
      ])

      await client.query(
        `INSERT INTO greenhouse_hiring.hiring_data_origin_audit
           (record_type, record_id, action, before_value, after_value, actor_user_id, reason, deleted_snapshot_json)
         VALUES ('hiring_application', $1, 'archive', $2, $2, $3, $4, $5)`,
        [
          applicationId,
          row.data_origin,
          input.actorUserId,
          input.reason,
          JSON.stringify({ beforeStage: row.stage, afterStage: 'closed' }),
        ],
      )

      return { applicationId, outcome: 'archived' as const }
    })

    results.push(result)
  }

  return { lane: 'archive', processed: results.length, results }
}

/**
 * Lane B — Borrado. Excepción ESTRECHA: sólo huérfanos que no dejaron rastro auditable.
 *
 * Corre la query de blockers ANTES y **aborta la corrida completa** si una sola fila del allowlist
 * falla cualquier condición. Nunca "casi todo": el mismo criterio de
 * `purge-task-1378-test-applications.ts`, que es el precedente que ya pagó este aprendizaje.
 */
export const deleteOrphanSyntheticRecords = async (input: ApplyPurgeInput): Promise<ApplyPurgeSummary> => {
  assertActorAndReason(input.actorUserId, input.reason)

  const plan = await planSyntheticPurge()
  const byId = new Map(plan.candidates.map(c => [c.applicationId, c]))

  // Preflight: si UNA sola fila no califica, no se borra NADA.
  for (const applicationId of input.applicationIds) {
    const candidate = byId.get(applicationId)

    if (!candidate) {
      throw new HiringValidationError(
        'La corrida se aborta: una postulación del allowlist no está marcada como no real.',
        'hiring_purge_blocked',
        422,
        { applicationId },
      )
    }

    if (candidate.deleteBlockers.length > 0) {
      throw new HiringValidationError(
        'La corrida se aborta: una postulación del allowlist tiene dependientes auditables. Usa el lane de archivado.',
        'hiring_purge_blocked',
        422,
        { applicationId, blockers: candidate.deleteBlockers },
      )
    }

    if (candidate.stage !== 'sourced') {
      throw new HiringValidationError(
        'La corrida se aborta: una postulación del allowlist ya fue trabajada por alguien.',
        'hiring_purge_blocked',
        422,
        { applicationId, stage: candidate.stage },
      )
    }
  }

  const results: PurgeEntryResult[] = []

  for (const applicationId of input.applicationIds) {
    const candidate = byId.get(applicationId)!

    await withGreenhousePostgresTransaction(async client => {
      // El audit se escribe ANTES del DELETE: si el borrado falla, la transacción revierte ambos, y
      // si tiene éxito queda constancia de que la fila existió.
      await client.query(
        `INSERT INTO greenhouse_hiring.hiring_data_origin_audit
           (record_type, record_id, action, before_value, after_value, actor_user_id, reason, deleted_snapshot_json)
         VALUES ('hiring_application', $1, 'delete', $2, $2, $3, $4, $5)`,
        [
          applicationId,
          candidate.dataOrigin,
          input.actorUserId,
          input.reason,
          JSON.stringify({ openingId: candidate.openingId, stage: candidate.stage }),
        ],
      )

      await client.query(`DELETE FROM greenhouse_hiring.hiring_application WHERE application_id = $1`, [applicationId])
    })

    results.push({ applicationId, outcome: 'deleted' })
  }

  return { lane: 'delete', processed: results.length, results }
}
