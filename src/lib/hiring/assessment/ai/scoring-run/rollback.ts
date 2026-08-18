import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  AI_SCORING_RUN_ITEM_TERMINAL_STATUSES,
  AI_SCORING_RUN_TERMINAL_STATUSES,
  type ReconcileAiScoringRunsResult,
} from '@/types/hiring-assessment-ai-run'

import { HiringValidationError } from '../../../errors'
import { cancelAssessmentAiScoringRun, reconcileAssessmentAiScoringRuns } from './commands'

// TASK-1734 Slice 6 — Rollback gobernado del carril de scoring IA (ADR D4/D6 + spec
// §Rollout Plan): la secuencia de drain que el operador ejecuta DESPUÉS de apagar los
// flags (confirm OFF → enqueue OFF → ESTE drain → cola manual). Primitive canónica:
// el CLI `pnpm hiring:ai:run-rollback`, la App API futura o Nexa consumen esta misma
// función — nadie re-implementa la secuencia (Full API Parity).
//
// Garantías (ADR D3, "cero items fuera de la cola"):
//  - NUNCA borra nada: cancel + reconcile son transiciones auditadas append-only.
//  - Un run `confirmed` jamás se toca (terminal-once; los cancels lo saltan).
//  - Toda respuesta sin score humano sigue en la cola manual por construcción — el
//    score IA solo se aplica vía confirm humano, así que cancelar propuestas nunca
//    "pierde" una respuesta. El reporte lo PRUEBA con los conteos residuales.

const RUN_TERMINAL_SQL = `(${AI_SCORING_RUN_TERMINAL_STATUSES.map(s => `'${s}'`).join(', ')})`
const ITEM_TERMINAL_SQL = `(${AI_SCORING_RUN_ITEM_TERMINAL_STATUSES.map(s => `'${s}'`).join(', ')})`

export interface RollbackRunSummary {
  runId: string
  assessmentId: string
  applicationId: string
  status: string
  createdAt: string | null
}

export interface RollbackResidual {
  /** Runs aún no terminales tras el drain (steady post-apply: 0). */
  nonTerminalRuns: number
  /** Items aún no terminales tras el drain (steady post-apply: 0). */
  nonTerminalItems: number
  /** Proposals `proposed` huérfanas que el reconcile debió cerrar (steady post-apply: 0). */
  orphanProposals: number
}

export interface RollbackAssessmentAiRunsReport {
  dryRun: boolean
  /** Runs no terminales encontrados al inicio (orden created_at asc — orden de cancel). */
  runsFound: RollbackRunSummary[]
  /** Run IDs efectivamente cancelados por esta ejecución (vacío en dry-run). */
  runsCancelled: string[]
  /** Resultado del reconcile (null en dry-run). */
  reconcile: ReconcileAiScoringRunsResult | null
  residual: RollbackResidual
  /**
   * Respuestas de los assessments afectados que siguen esperando score humano —
   * la evidencia de que el trabajo VOLVIÓ a la cola manual, no desapareció.
   */
  manualQueuePending: number
  /** true si post-apply quedó CERO residual (el criterio de éxito del rollback). */
  clean: boolean
}

interface NonTerminalRunRow extends Record<string, unknown> {
  run_id: unknown
  assessment_id: unknown
  application_id: unknown
  status: unknown
  created_at: unknown
}

const listNonTerminalRuns = async (): Promise<RollbackRunSummary[]> => {
  const rows = await runGreenhousePostgresQuery<NonTerminalRunRow>(
    `SELECT run_id, assessment_id, application_id, status, created_at
       FROM greenhouse_hiring.hiring_assessment_ai_scoring_run
      WHERE status NOT IN ${RUN_TERMINAL_SQL}
      ORDER BY created_at, run_id`,
  )

  return rows.map(row => ({
    runId: String(row.run_id),
    assessmentId: String(row.assessment_id),
    applicationId: String(row.application_id),
    status: String(row.status),
    createdAt: row.created_at == null ? null : new Date(String(row.created_at)).toISOString(),
  }))
}

interface ResidualRow extends Record<string, unknown> {
  non_terminal_runs: unknown
  non_terminal_items: unknown
  orphan_proposals: unknown
}

const readResidual = async (): Promise<RollbackResidual> => {
  const rows = await runGreenhousePostgresQuery<ResidualRow>(
    `SELECT
       (SELECT COUNT(*)::int FROM greenhouse_hiring.hiring_assessment_ai_scoring_run
         WHERE status NOT IN ${RUN_TERMINAL_SQL}) AS non_terminal_runs,
       (SELECT COUNT(*)::int FROM greenhouse_hiring.hiring_assessment_ai_scoring_run_item
         WHERE status NOT IN ${ITEM_TERMINAL_SQL}) AS non_terminal_items,
       (SELECT COUNT(*)::int
          FROM greenhouse_hiring.hiring_assessment_ai_proposal p
          JOIN greenhouse_hiring.hiring_assessment_response r ON r.response_id = p.target_ref
          JOIN greenhouse_hiring.hiring_assessment a ON a.assessment_id = r.assessment_id
         WHERE p.kind = 'response_score'
           AND p.status = 'proposed'
           AND (r.human_score IS NOT NULL OR a.status = 'scored')) AS orphan_proposals`,
  )

  const row = rows[0] ?? { non_terminal_runs: 0, non_terminal_items: 0, orphan_proposals: 0 }

  return {
    nonTerminalRuns: Number(row.non_terminal_runs ?? 0),
    nonTerminalItems: Number(row.non_terminal_items ?? 0),
    orphanProposals: Number(row.orphan_proposals ?? 0),
  }
}

const countManualQueuePending = async (assessmentIds: string[]): Promise<number> => {
  if (assessmentIds.length === 0) return 0

  const rows = await runGreenhousePostgresQuery<{ n: unknown }>(
    `SELECT COUNT(*)::int AS n
       FROM greenhouse_hiring.hiring_assessment_response
      WHERE assessment_id = ANY($1::text[])
        AND needs_human_rating = TRUE
        AND human_score IS NULL`,
    [assessmentIds],
  )

  return Number(rows[0]?.n ?? 0)
}

export interface RollbackAssessmentAiRunsInput {
  actorUserId: string
  /** false (default del CLI) = dry-run: enumera y reporta, CERO mutación. */
  apply: boolean
  reasonCode?: string
}

/**
 * Secuencia de rollback del ADR (paso 3 de la revert sequence — los flags ya deben
 * estar OFF, eso es del operador y NO lo hace esta función):
 *
 *  1. Enumerar runs no terminales (orden created_at — determinista, replayable).
 *  2. `apply`: cancel ordenado vía `cancelAssessmentAiScoringRun` (terminal-once,
 *     `FOR UPDATE`; cancela también los items no terminales del run).
 *  3. `apply`: `reconcileAssessmentAiScoringRuns` cierra proposals/items huérfanos
 *     (`superseded_by_manual`) incluyendo el backlog pre-existente al aggregate.
 *  4. Verificación: residual (runs/items/proposals) + conteo de la cola manual de
 *     los assessments afectados. `clean=true` ⇔ residual en cero.
 *
 * Idempotente: re-ejecutar sobre un sistema ya drenado es no-op con reporte limpio.
 */
export const rollbackAssessmentAiScoringRuns = async (
  input: RollbackAssessmentAiRunsInput,
): Promise<RollbackAssessmentAiRunsReport> => {
  if (!input.actorUserId || input.actorUserId.trim().length === 0) {
    throw new HiringValidationError(
      'El rollback requiere un actor identificable (auditoría append-only).',
      'assessment_ai_run_missing_actor',
      401,
    )
  }

  const runsFound = await listNonTerminalRuns()
  const runsCancelled: string[] = []
  let reconcile: ReconcileAiScoringRunsResult | null = null

  if (input.apply) {
    // Secuencial a propósito: cada cancel es su propia tx con lock FOR UPDATE del run.
    for (const run of runsFound) {
      await cancelAssessmentAiScoringRun(
        run.runId,
        input.actorUserId,
        input.reasonCode ?? 'rollback_drain',
      )
      runsCancelled.push(run.runId)
    }

    reconcile = await reconcileAssessmentAiScoringRuns(input.actorUserId)
  }

  const residual = await readResidual()

  const manualQueuePending = await countManualQueuePending(
    [...new Set(runsFound.map(run => run.assessmentId))],
  )

  return {
    dryRun: !input.apply,
    runsFound,
    runsCancelled,
    reconcile,
    residual,
    manualQueuePending,
    clean:
      residual.nonTerminalRuns === 0 &&
      residual.nonTerminalItems === 0 &&
      residual.orphanProposals === 0,
  }
}
