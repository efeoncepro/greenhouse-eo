import 'server-only'

import { createHash } from 'node:crypto'

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import type {
  AiScoringRunWithItems,
  ReconcileAiScoringRunsResult,
  StartAiScoringRunResult,
} from '@/types/hiring-assessment-ai-run'
import { HUMAN_RATED_QUESTION_TYPES } from '@/types/hiring-assessment'

import { HiringNotFoundError, HiringValidationError } from '../../../errors'
import { HIRING_ASSESSMENT_SCORING_PROMPT_VERSION, getHiringAssessmentScoringModel } from '../config'
import { supersedeOrphanResponseScoreProposals } from '../proposal-store'
import { HIRING_ASSESSMENT_AI_RUN_POLICY_VERSION, isHiringAssessmentAiRunEnqueueEnabled } from './config'
import {
  createScoringRun,
  findActiveScoringRun,
  getScoringRunById,
  insertRunEvent,
  insertRunItems,
  listRunItems,
  listScoringRunsForAssessment,
  lockScoringRunForUpdate,
  transitionRunItem,
  transitionScoringRun,
} from './store'

// TASK-1734 Slice 1 — Commands gobernados del run aggregate (ADR D1/D3). SOLO orquesta:
// cero llamadas a provider acá (el fan-out LLM es el drain del ops-worker, Slice 2).
// El run NUNCA decide, rankea, mueve etapa, asigna test ni envía correo.

const MAX_ANSWER_CHARS = 6000

const extractAnswerText = (answer: Record<string, unknown>): string => {
  if (typeof answer.text === 'string') return answer.text.slice(0, MAX_ANSWER_CHARS)
  if (typeof answer.value === 'string') return answer.value.slice(0, MAX_ANSWER_CHARS)

  return JSON.stringify(answer).slice(0, MAX_ANSWER_CHARS)
}

export interface EligibleResponseRow extends Record<string, unknown> {
  response_id: unknown
  answer_json: unknown
  question_prompt: unknown
  rubric_json: unknown
}

/**
 * Digest inmutable del run (ADR D1): answers + rubric + prompt version + policy version +
 * **modelo EFECTIVO resuelto** (`HIRING_ASSESSMENT_AI_SCORING_MODEL` override incluido —
 * Delta punto 5; NUNCA el default asumido). Solo hashes: la PII cruda no viaja ni persiste.
 */
export const computeScoringRunInputDigest = (
  assessmentId: string,
  effectiveModel: string,
  promptVersion: string,
  policyVersion: string,
  responses: Array<{ responseId: string; questionPrompt: string; rubricJson: unknown; answerText: string }>,
): string => {
  const parts = responses
    .map(r =>
      createHash('sha256')
        .update(`${r.responseId}|${r.questionPrompt}|${JSON.stringify(r.rubricJson ?? {})}|${r.answerText}`)
        .digest('hex'),
    )
    .sort()

  return createHash('sha256')
    .update(`${assessmentId}|${effectiveModel}|${promptVersion}|${policyVersion}|${parts.join('|')}`)
    .digest('hex')
}

/**
 * Respuestas elegibles: human-rated (`open_text|situational`) pendientes de score humano,
 * SOLO del assessment exacto. Exportada para el self-heal de enumeración del drain
 * (`execute.ts`); `client` opcional para correr dentro de la tx del caller.
 */
export const listEligibleResponses = async (
  assessmentId: string,
  client: PoolClient | null = null,
): Promise<EligibleResponseRow[]> => {
  const text = `SELECT r.response_id, r.answer_json, q.prompt AS question_prompt, q.rubric_json
       FROM greenhouse_hiring.hiring_assessment_response r
       JOIN greenhouse_hiring.hiring_question q ON q.question_id = r.question_id
      WHERE r.assessment_id = $1
        AND r.needs_human_rating = TRUE
        AND r.human_score IS NULL
        AND q.type = ANY($2::text[])
      ORDER BY r.response_id`

  const values = [assessmentId, [...HUMAN_RATED_QUESTION_TYPES]]

  if (client) {
    const result = await client.query(text, values)

    return result.rows as EligibleResponseRow[]
  }

  return runGreenhousePostgresQuery<EligibleResponseRow>(text, values)
}

/**
 * Recomputa el digest del run HOY sobre el conjunto exacto de respuestas de sus items,
 * con el modelo/prompt/policy EFECTIVOS del runtime actual (Slice 4, gate de vigencia
 * del confirm — ADR D1: un digest stale exige nueva propuesta/revisión, nunca confirm).
 * El conjunto es el de los items del run (no `listEligibleResponses`, que ya excluye las
 * respuestas resueltas una a una): mismos inputs ⇒ mismo digest; answer/rubric/modelo/
 * prompt/policy cambiados ⇒ digest distinto ⇒ `run_stale`.
 */
export const computeCurrentScoringRunDigest = async (
  assessmentId: string,
  responseIds: string[],
  client: PoolClient | null = null,
): Promise<string> => {
  const text = `SELECT r.response_id, r.answer_json, q.prompt AS question_prompt, q.rubric_json
       FROM greenhouse_hiring.hiring_assessment_response r
       JOIN greenhouse_hiring.hiring_question q ON q.question_id = r.question_id
      WHERE r.response_id = ANY($1::text[])`

  const values = [responseIds]

  const rows: EligibleResponseRow[] = client
    ? ((await client.query(text, values)).rows as EligibleResponseRow[])
    : await runGreenhousePostgresQuery<EligibleResponseRow>(text, values)

  return computeScoringRunInputDigest(
    assessmentId,
    getHiringAssessmentScoringModel(),
    HIRING_ASSESSMENT_SCORING_PROMPT_VERSION,
    HIRING_ASSESSMENT_AI_RUN_POLICY_VERSION,
    rows.map(r => ({
      responseId: String(r.response_id),
      questionPrompt: String(r.question_prompt),
      rubricJson: r.rubric_json,
      answerText: extractAnswerText((r.answer_json ?? {}) as Record<string, unknown>),
    })),
  )
}

interface AssessmentRow extends Record<string, unknown> {
  assessment_id: unknown
  application_id: unknown
  status: unknown
}

const requireAssessment = async (assessmentId: string): Promise<{ assessmentId: string; applicationId: string; status: string }> => {
  const rows = await runGreenhousePostgresQuery<AssessmentRow>(
    `SELECT assessment_id, application_id, status FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1`,
    [assessmentId],
  )

  if (!rows[0]) {
    throw new HiringNotFoundError('El assessment no existe.', 'assessment_not_found')
  }

  return {
    assessmentId: String(rows[0].assessment_id),
    applicationId: String(rows[0].application_id),
    status: String(rows[0].status),
  }
}

/**
 * Command `startAssessmentAiScoringRun` — crea el run durable para un assessment EXACTO.
 *
 * - Flag `HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED` OFF → 409 estable (el consumer del
 *   evento trata ese code como skip; la cola manual sigue siendo el camino).
 * - Idempotente por (assessmentId, input_digest): un replay/duplicado de
 *   `hiring.assessment.submitted` retorna el run activo existente con `created=false`,
 *   NUNCA duplica runs, items ni (en Slice 2) llamadas a provider.
 * - Transaccional y de milisegundos: cero provider inline (ADR D4 — el fan-out es del drain).
 * - Sin items elegibles → el run queda `awaiting_review` con reason `no_eligible_items`
 *   (evidencia honesta de que no había nada que puntuar; nunca desaparece trabajo).
 */
export const startAssessmentAiScoringRun = async (
  assessmentId: string,
  actorUserId: string | null,
): Promise<StartAiScoringRunResult> => {
  if (!isHiringAssessmentAiRunEnqueueEnabled()) {
    throw new HiringValidationError(
      'El scoring asíncrono por assessment está deshabilitado.',
      'assessment_ai_run_enqueue_disabled',
      409,
    )
  }

  const assessment = await requireAssessment(assessmentId)
  const eligible = await listEligibleResponses(assessmentId)
  const effectiveModel = getHiringAssessmentScoringModel()

  const inputDigest = computeScoringRunInputDigest(
    assessmentId,
    effectiveModel,
    HIRING_ASSESSMENT_SCORING_PROMPT_VERSION,
    HIRING_ASSESSMENT_AI_RUN_POLICY_VERSION,
    eligible.map(r => ({
      responseId: String(r.response_id),
      questionPrompt: String(r.question_prompt),
      rubricJson: r.rubric_json,
      answerText: extractAnswerText((r.answer_json ?? {}) as Record<string, unknown>),
    })),
  )

  // Idempotencia ANTES de la tx: run activo con el mismo digest → retornarlo tal cual.
  const existing = await findActiveScoringRun(assessmentId, inputDigest)

  if (existing) {
    return { run: existing, items: await listRunItems(existing.runId), created: false }
  }

  return withGreenhousePostgresTransaction(async client => {
    const { run, created } = await createScoringRun(client, {
      assessmentId,
      applicationId: assessment.applicationId,
      inputDigest,
      model: effectiveModel,
      promptVersion: HIRING_ASSESSMENT_SCORING_PROMPT_VERSION,
      policyVersion: HIRING_ASSESSMENT_AI_RUN_POLICY_VERSION,
      createdBy: actorUserId,
    })

    // Carrera perdida del índice único parcial: retornar el run ganador sin re-enumerar.
    if (!created) {
      return { run, items: await listRunItems(run.runId, client), created: false }
    }

    await insertRunEvent(client, {
      runId: run.runId,
      eventType: 'run_transition',
      fromStatus: null,
      toStatus: 'created',
      actorUserId,
    })

    const enumerating = await transitionScoringRun(client, run, 'enumerating', { actorUserId })
    const items = await insertRunItems(client, enumerating, eligible.map(r => String(r.response_id)))

    const settled =
      items.length > 0
        ? await transitionScoringRun(client, enumerating, 'scoring', { actorUserId })
        : await transitionScoringRun(client, enumerating, 'awaiting_review', {
            actorUserId,
            reasonCode: 'no_eligible_items',
          })

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringAssessmentAiScoringRun,
        aggregateId: settled.runId,
        eventType: EVENT_TYPES.hiringAssessmentAiRunCreated,
        payload: {
          runId: settled.runId,
          assessmentId,
          applicationId: assessment.applicationId,
          itemCount: items.length,
          model: effectiveModel,
          promptVersion: HIRING_ASSESSMENT_SCORING_PROMPT_VERSION,
          policyVersion: HIRING_ASSESSMENT_AI_RUN_POLICY_VERSION,
          actorUserId,
        },
      },
      client,
    )

    return { run: settled, items, created: true }
  })
}

/** Reader exact-scoped: run + items (readback). `null` si el run no existe. */
export const getAssessmentAiScoringRun = async (runId: string): Promise<AiScoringRunWithItems | null> => {
  const run = await getScoringRunById(runId)

  if (!run) return null

  return { run, items: await listRunItems(runId) }
}

/** Reader exact-scoped por assessment (nunca lista global — Delta punto 7). */
export const listAssessmentAiScoringRuns = listScoringRunsForAssessment

/**
 * Command `cancelAssessmentAiScoringRun` — terminal-once bajo `FOR UPDATE`.
 * NO se gatea por flag (Delta punto 4: el rollback drena por commands, no por el master).
 * - Ya `cancelled` → no-op idempotente. `confirmed` → 409 (nunca se des-confirma).
 * - Cancela también todos los items no terminales (nada queda huérfano en la cola).
 */
export const cancelAssessmentAiScoringRun = async (
  runId: string,
  actorUserId: string,
  reasonCode: string | null = null,
): Promise<AiScoringRunWithItems> => {
  if (!actorUserId) {
    throw new HiringValidationError('Falta el usuario que cancela.', 'assessment_ai_run_missing_actor', 401)
  }

  return withGreenhousePostgresTransaction(async client => {
    const run = await lockScoringRunForUpdate(client, runId)

    const cancelled = await transitionScoringRun(client, run, 'cancelled', {
      actorUserId,
      reasonCode: reasonCode ?? 'operator_cancelled',
    })

    // apply=false (ya estaba cancelled) → no re-tocar items.
    if (run.status === 'cancelled') {
      return { run: cancelled, items: await listRunItems(runId, client) }
    }

    const items = await listRunItems(runId, client)
    const settledItems = []

    // Secuencial a propósito: un PoolClient dentro de una tx no paraleliza queries.
    for (const item of items) {
      settledItems.push(
        ['pending', 'claimed', 'proposed'].includes(item.status)
          ? await transitionRunItem(client, item, 'cancelled', { actorUserId, reasonCode: 'run_cancelled' })
          : item,
      )
    }

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringAssessmentAiScoringRun,
        aggregateId: cancelled.runId,
        eventType: EVENT_TYPES.hiringAssessmentAiRunCancelled,
        payload: {
          runId: cancelled.runId,
          assessmentId: cancelled.assessmentId,
          applicationId: cancelled.applicationId,
          reasonCode: reasonCode ?? 'operator_cancelled',
          actorUserId,
        },
      },
      client,
    )

    return { run: cancelled, items: settledItems }
  })
}

const ITEM_TERMINAL_SQL = `('abstained', 'failed', 'stale', 'superseded_by_manual', 'cancelled', 'confirmed')`

interface SupersededItemRow extends Record<string, unknown> {
  run_item_id: unknown
  run_id: unknown
  prev_status: unknown
}

interface ClosedRunRow extends Record<string, unknown> {
  run_id: unknown
  prev_status: unknown
}

/**
 * Command `reconcileAssessmentAiScoringRuns` — idempotente, pensado para cron/operador.
 * Cierra el backlog huérfano del ADR D3 (Delta punto 3, caso EO-ASM-0050):
 *
 * 1. Proposals `response_score` aún `proposed` cuya respuesta ya tiene score humano (o el
 *    assessment ya está `scored`) → `superseded_by_manual` (incluye el backlog PRE-existente
 *    al run aggregate: la condición es sobre el ledger, no sobre items del run).
 * 2. Items no terminales cuya respuesta ya recibió score humano → `superseded_by_manual`.
 * 3. Runs no terminales de assessments ya `scored` sin items pendientes → `cancelled`
 *    con reason `superseded_by_manual`.
 *
 * NUNCA borra nada: toda cierre es transición auditada + historia append-only.
 * NO se gatea por flag (es parte del camino de rollback/limpieza).
 */
export const reconcileAssessmentAiScoringRuns = async (
  actorUserId: string | null,
): Promise<ReconcileAiScoringRunsResult> =>
  withGreenhousePostgresTransaction(async client => {
    // 1. Backlog huérfano del proposal ledger (pre-existente + nuevo).
    const superseded = await supersedeOrphanResponseScoreProposals(client, { actorUserId })

    // 2. Items no terminales superados por el carril manual.
    const itemRows = await queryRows<SupersededItemRow>(
      client,
      `UPDATE greenhouse_hiring.hiring_assessment_ai_scoring_run_item i
         SET status = 'superseded_by_manual', reason_code = 'human_score_applied', updated_at = NOW()
       FROM greenhouse_hiring.hiring_assessment_response r
       WHERE i.response_id = r.response_id
         AND i.status NOT IN ${ITEM_TERMINAL_SQL}
         AND r.human_score IS NOT NULL
       RETURNING i.run_item_id, i.run_id, 'superseded' AS prev_status`,
      [],
    )

    for (const row of itemRows) {
      await insertRunEvent(client, {
        runId: String(row.run_id),
        runItemId: String(row.run_item_id),
        eventType: 'reconciliation',
        toStatus: 'superseded_by_manual',
        reasonCode: 'human_score_applied',
        actorUserId,
      })
    }

    // 3. Runs sin trabajo restante de assessments ya cerrados por el carril manual.
    const runRows = await queryRows<ClosedRunRow>(
      client,
      `UPDATE greenhouse_hiring.hiring_assessment_ai_scoring_run u
         SET status = 'cancelled', status_reason = 'superseded_by_manual', updated_at = NOW()
       FROM greenhouse_hiring.hiring_assessment a
       WHERE a.assessment_id = u.assessment_id
         AND u.status NOT IN ('confirmed', 'cancelled', 'failed')
         AND a.status = 'scored'
         AND NOT EXISTS (
           SELECT 1 FROM greenhouse_hiring.hiring_assessment_ai_scoring_run_item i
           WHERE i.run_id = u.run_id AND i.status NOT IN ${ITEM_TERMINAL_SQL}
         )
       RETURNING u.run_id, 'closed' AS prev_status`,
      [],
    )

    for (const row of runRows) {
      await insertRunEvent(client, {
        runId: String(row.run_id),
        eventType: 'reconciliation',
        toStatus: 'cancelled',
        reasonCode: 'superseded_by_manual',
        actorUserId,
      })
    }

    const result: ReconcileAiScoringRunsResult = {
      proposalsSuperseded: superseded.length,
      itemsSuperseded: itemRows.length,
      runsClosed: runRows.length,
    }

    if (result.proposalsSuperseded > 0 || result.itemsSuperseded > 0 || result.runsClosed > 0) {
      await publishOutboxEvent(
        {
          aggregateType: AGGREGATE_TYPES.hiringAssessmentAiScoringRun,
          aggregateId: 'assessment-ai-scoring',
          eventType: EVENT_TYPES.hiringAssessmentAiRunReconciled,
          payload: { ...result, actorUserId },
        },
        client,
      )
    }

    return result
  })

const queryRows = async <T extends Record<string, unknown>>(
  client: PoolClient,
  text: string,
  values: unknown[],
): Promise<T[]> => {
  const result = await client.query(text, values)

  return result.rows as T[]
}
