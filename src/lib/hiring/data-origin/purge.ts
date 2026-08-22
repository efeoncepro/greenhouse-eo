import 'server-only'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { HiringValidationError } from '../errors'
import { realOnlyPredicate } from './contracts'
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
  /** `null` ⇒ la postulación todavía no está archivada. Es el ÚNICO eje de archivado (ADR §5). */
  archivedAt: string | null
  /** Dependientes que impiden el borrado. Vacío ⇒ la fila califica para Lane B. */
  deleteBlockers: string[]
}

/**
 * TASK-1748 Slice 2 — archivar significa lo mismo en las tres entidades, así que el plan enumera
 * las tres. `TASK-1739` sólo enumeraba postulaciones y por eso el archivado quedó a un tercio:
 * 11 fichas sintéticas seguían `active` y 14 vacantes sintéticas en `draft`/`active`.
 */
export interface PurgeFacetCandidate {
  candidateFacetId: string
  dataOrigin: string
  status: string
}

export interface PurgeOpeningCandidate {
  openingId: string
  dataOrigin: string
  status: string
  publicationStatus: string
}

export interface PurgePlan {
  generatedAt: string
  candidates: PurgeCandidate[]
  facets: PurgeFacetCandidate[]
  openings: PurgeOpeningCandidate[]
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

/**
 * Estados de vacante que ya son terminales: archivar no los reescribe. Cancelar una vacante que
 * alguien cerró o llenó borraría el desenlace real de ese proceso.
 */
const TERMINAL_OPENING_STATUSES = new Set(['cancelled', 'closed', 'filled'])

/** Plan READ-ONLY sobre registros ya marcados como no reales. No infiere por nombre jamás. */
export const planSyntheticPurge = async (): Promise<PurgePlan> => {
  const rows = await runGreenhousePostgresQuery<{
    application_id: string
    opening_id: string
    data_origin: string
    stage: string
    archived_at: Date | string | null
  }>(
    `SELECT application_id, opening_id, data_origin, stage, archived_at
       FROM greenhouse_hiring.hiring_application
      WHERE data_origin <> 'real'
      ORDER BY created_at`,
  )

  // La ficha no tiene procedencia propia: la hereda de la persona (`candidate_facet` no declara
  // `data_origin`). El predicado canónico viaja sobre `ip`, nunca sobre `cf`.
  const facetRows = await runGreenhousePostgresQuery<{
    candidate_facet_id: string
    data_origin: string
    status: string
  }>(
    `SELECT cf.candidate_facet_id, ip.data_origin, cf.status
       FROM greenhouse_hiring.candidate_facet cf
       JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = cf.identity_profile_id
      WHERE NOT (${realOnlyPredicate('ip')}) AND cf.status <> 'archived'
      ORDER BY cf.candidate_facet_id`,
  )

  const openingRows = await runGreenhousePostgresQuery<{
    opening_id: string
    data_origin: string
    status: string
    publication_status: string
  }>(
    `SELECT opening_id, data_origin, status, publication_status
       FROM greenhouse_hiring.hiring_opening
      WHERE data_origin <> 'real' AND status NOT IN ('cancelled', 'closed', 'filled')
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
      archivedAt: row.archived_at ? new Date(row.archived_at).toISOString() : null,
      deleteBlockers: blockers.get(row.application_id) ?? [],
    })),
    facets: facetRows.map(row => ({
      candidateFacetId: row.candidate_facet_id,
      dataOrigin: row.data_origin,
      status: row.status,
    })),
    openings: openingRows.map(row => ({
      openingId: row.opening_id,
      dataOrigin: row.data_origin,
      status: row.status,
      publicationStatus: row.publication_status,
    })),
  }
}

export interface ApplyPurgeInput {
  lane: PurgeLane
  applicationIds: string[]
  /** Fichas de candidato a archivar. Omitirlo NO archiva ninguna: nada se escribe sin allowlist. */
  candidateFacetIds?: string[]
  /** Vacantes a archivar. Omitirlo NO archiva ninguna. */
  openingIds?: string[]
  actorUserId: string
  reason: string
}

/** Entidades que el archivado toca. Coincide con el CHECK de `hiring_data_origin_audit.record_type`. */
export type PurgeRecordType = 'hiring_application' | 'candidate_facet' | 'hiring_opening'

export interface PurgeEntryResult {
  recordType: PurgeRecordType
  recordId: string
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
 * **Archivar tiene EJE PROPIO y jamás toca `stage`** (`GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_
 * VOCABULARY_DECISION_V1` §5 y §12). `TASK-1739` archivaba escribiendo `stage='closed'`, y ese
 * `UPDATE` es el origen de las 32 filas `closed` sin desenlace que ensuciaron el diagnóstico de la
 * auditoría del vocabulario: `closed` significa «el recorrido de esta persona terminó, con desenlace
 * declarado», y archivar un registro sintético no declara el desenlace de nadie. Son dos preguntas
 * distintas y viven en dos columnas distintas:
 *
 *   `stage`        → dónde va la persona en el recorrido
 *   `archived_at`  → si el REGISTRO sigue a la vista del operador
 *
 * La deuda que este docstring declaraba antes —«archivar mueve `stage` a `closed` pero NO setea
 * `decision`, y el reader de retención se guarda con `decision IS NULL`»— **desaparece con el cambio
 * de eje**: archivar ya no escribe `stage`, así que no puede fabricar un `closed` sin desenlace ni
 * congelar el reloj de retención de nadie.
 *
 * Archiva las TRES entidades sobre allowlist explícita, cada una en su propia transacción con CAS
 * sobre su estado actual y su fila de audit. Re-ejecutar es no-op (`already_archived`).
 */
export const archiveSyntheticRecords = async (input: ApplyPurgeInput): Promise<ApplyPurgeSummary> => {
  assertActorAndReason(input.actorUserId, input.reason)

  const results: PurgeEntryResult[] = []

  const writeAudit = async (
    client: { query: (sql: string, values: unknown[]) => Promise<unknown> },
    recordType: PurgeRecordType,
    recordId: string,
    dataOrigin: string,
    snapshot: Record<string, unknown>,
  ) => {
    await client.query(
      `INSERT INTO greenhouse_hiring.hiring_data_origin_audit
         (record_type, record_id, action, before_value, after_value, actor_user_id, reason, deleted_snapshot_json)
       VALUES ($1, $2, 'archive', $3, $3, $4, $5, $6)`,
      [recordType, recordId, dataOrigin, input.actorUserId, input.reason, JSON.stringify(snapshot)],
    )
  }

  for (const applicationId of input.applicationIds) {
    const result = await withGreenhousePostgresTransaction(async client => {
      const current = await client.query(
        `SELECT data_origin, stage, archived_at
           FROM greenhouse_hiring.hiring_application
          WHERE application_id = $1 FOR UPDATE`,
        [applicationId],
      )

      const row = current.rows[0] as
        | { data_origin: string; stage: string; archived_at: Date | string | null }
        | undefined

      if (!row) {
        return { recordType: 'hiring_application' as const, recordId: applicationId, outcome: 'skipped' as const, reasonCode: 'not_found' as const }
      }

      // Nunca se archiva un dato real por esta vía: la puerta es la procedencia, no el criterio del operador.
      if (row.data_origin === 'real') {
        return { recordType: 'hiring_application' as const, recordId: applicationId, outcome: 'skipped' as const, reasonCode: 'not_synthetic' as const }
      }

      // La guarda de idempotencia lee el EJE DE ARCHIVADO, no `stage`. Leerla en `stage='closed'`
      // (como hacía TASK-1739) confundía «archivado» con «proceso cerrado».
      if (row.archived_at) {
        return { recordType: 'hiring_application' as const, recordId: applicationId, outcome: 'skipped' as const, reasonCode: 'already_archived' as const }
      }

      await client.query(
        `UPDATE greenhouse_hiring.hiring_application SET archived_at = NOW() WHERE application_id = $1`,
        [applicationId],
      )

      // El snapshot registra el archivado real. `stage` viaja como CONTEXTO de lo que había, no como
      // un campo que esta función tocó: `beforeStage`/`afterStage` describían una mutación que ya no
      // ocurre y habrían mentido.
      await writeAudit(client, 'hiring_application', applicationId, row.data_origin, {
        axis: 'archived_at',
        stageAtArchive: row.stage,
      })

      return { recordType: 'hiring_application' as const, recordId: applicationId, outcome: 'archived' as const }
    })

    results.push(result)
  }

  for (const candidateFacetId of input.candidateFacetIds ?? []) {
    const result = await withGreenhousePostgresTransaction(async client => {
      const current = await client.query(
        `SELECT cf.status, ip.data_origin
           FROM greenhouse_hiring.candidate_facet cf
           JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = cf.identity_profile_id
          WHERE cf.candidate_facet_id = $1 FOR UPDATE OF cf`,
        [candidateFacetId],
      )

      const row = current.rows[0] as { status: string; data_origin: string } | undefined

      if (!row) {
        return { recordType: 'candidate_facet' as const, recordId: candidateFacetId, outcome: 'skipped' as const, reasonCode: 'not_found' as const }
      }

      if (row.data_origin === 'real') {
        return { recordType: 'candidate_facet' as const, recordId: candidateFacetId, outcome: 'skipped' as const, reasonCode: 'not_synthetic' as const }
      }

      if (row.status === 'archived') {
        return { recordType: 'candidate_facet' as const, recordId: candidateFacetId, outcome: 'skipped' as const, reasonCode: 'already_archived' as const }
      }

      await client.query(
        `UPDATE greenhouse_hiring.candidate_facet SET status = 'archived' WHERE candidate_facet_id = $1`,
        [candidateFacetId],
      )

      await writeAudit(client, 'candidate_facet', candidateFacetId, row.data_origin, {
        axis: 'status',
        beforeStatus: row.status,
        afterStatus: 'archived',
      })

      return { recordType: 'candidate_facet' as const, recordId: candidateFacetId, outcome: 'archived' as const }
    })

    results.push(result)
  }

  for (const openingId of input.openingIds ?? []) {
    const result = await withGreenhousePostgresTransaction(async client => {
      const current = await client.query(
        `SELECT data_origin, status, publication_status
           FROM greenhouse_hiring.hiring_opening
          WHERE opening_id = $1 FOR UPDATE`,
        [openingId],
      )

      const row = current.rows[0] as
        | { data_origin: string; status: string; publication_status: string }
        | undefined

      if (!row) {
        return { recordType: 'hiring_opening' as const, recordId: openingId, outcome: 'skipped' as const, reasonCode: 'not_found' as const }
      }

      if (row.data_origin === 'real') {
        return { recordType: 'hiring_opening' as const, recordId: openingId, outcome: 'skipped' as const, reasonCode: 'not_synthetic' as const }
      }

      // `closed`/`filled` son desenlaces que alguien declaró: archivar no los reescribe.
      if (TERMINAL_OPENING_STATUSES.has(row.status)) {
        return { recordType: 'hiring_opening' as const, recordId: openingId, outcome: 'skipped' as const, reasonCode: 'already_archived' as const }
      }

      // La publicación se cierra junto con el estado. Una vacante `cancelled` que sigue diciendo
      // `published` es una contradicción, y contradice además la guarda de `publishOpening`, que
      // prohíbe publicar una vacante no real.
      const nextPublicationStatus = row.publication_status === 'draft' ? 'draft' : 'closed'

      await client.query(
        `UPDATE greenhouse_hiring.hiring_opening
            SET status = 'cancelled', publication_status = $2
          WHERE opening_id = $1`,
        [openingId, nextPublicationStatus],
      )

      await writeAudit(client, 'hiring_opening', openingId, row.data_origin, {
        axis: 'status',
        beforeStatus: row.status,
        afterStatus: 'cancelled',
        beforePublicationStatus: row.publication_status,
        afterPublicationStatus: nextPublicationStatus,
      })

      return { recordType: 'hiring_opening' as const, recordId: openingId, outcome: 'archived' as const }
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

    results.push({ recordType: 'hiring_application', recordId: applicationId, outcome: 'deleted' })
  }

  return { lane: 'delete', processed: results.length, results }
}
