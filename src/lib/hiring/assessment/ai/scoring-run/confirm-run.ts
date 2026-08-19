import 'server-only'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import {
  AI_SCORING_RUN_ITEM_RESOLUTIONS,
  type AiScoringRun,
  type AiScoringRunItem,
  type ConfirmAssessmentAiScoringRunInput,
  type ConfirmAssessmentAiScoringRunResult,
  type ResolveScoringRunItemInput,
  type ResolveScoringRunItemResult,
} from '@/types/hiring-assessment-ai-run'

import { HiringNotFoundError, HiringValidationError } from '../../../errors'
import { confirmAiProposal } from '../confirm'
import { requireAiProposalById } from '../proposal-store'
import { computeResponseScoreInputDigest, extractResponseAnswerText } from '../score-response'
import { computeCurrentScoringRunDigest } from './commands'
import { isHiringAssessmentAiRunConfirmEnabled } from './config'
import {
  getRunItemInRun,
  insertRunEvent,
  listRunItems,
  lockScoringRunForUpdate,
  transitionRunItem,
  transitionScoringRun,
} from './store'
import { resolveItemTransition, resolveRunTransition } from './state'

// TASK-1734 Slice 4 — Resolución de excepciones UNO a uno + confirmación de run por lote
// (ADR D1 manifest append-only, Delta 2026-08-16 punto 9 anti-anclaje). Ambos commands
// aplican scores EXCLUSIVAMENTE a través del confirm canónico de TASK-1361
// (`confirmAiProposal` → `recordHumanScore`): cero bypass, cero segundo writer. Ningún
// command decide, rankea, mueve etapa, asigna test ni envía correo; el resultado es
// exclusivamente interno para operadores autorizados.

// ── Staleness por item (misma fórmula del propose — score-response.ts) ──

const computeCurrentResponseDigest = async (client: PoolClient, responseId: string): Promise<string> => {
  const result = await client.query(
    `SELECT r.answer_json, q.prompt AS question_prompt
       FROM greenhouse_hiring.hiring_assessment_response r
       JOIN greenhouse_hiring.hiring_question q ON q.question_id = r.question_id
      WHERE r.response_id = $1`,
    [responseId],
  )

  const row = result.rows[0] as { answer_json: unknown; question_prompt: unknown } | undefined

  if (!row) {
    throw new HiringNotFoundError('La respuesta no existe.', 'assessment_response_not_found')
  }

  return computeResponseScoreInputDigest(
    responseId,
    String(row.question_prompt),
    extractResponseAnswerText((row.answer_json ?? {}) as Record<string, unknown>),
  )
}

const REVIEWABLE_RUN_STATUSES = ['awaiting_review', 'confirmable'] as const

const assertRunReviewable = (run: AiScoringRun): void => {
  if (!(REVIEWABLE_RUN_STATUSES as readonly string[]).includes(run.status)) {
    throw new HiringValidationError(
      'El run no está en estado de revisión.',
      'assessment_ai_run_not_reviewable',
      409,
      { status: run.status },
    )
  }
}

// ── Resolución de excepciones (mandatory_review | quality_sample, UNO a uno) ──

type ResolveOutcome =
  | { kind: 'applied'; item: AiScoringRunItem }
  | { kind: 'noop'; item: AiScoringRunItem }
  | { kind: 'stale'; item: AiScoringRunItem }

/**
 * Command `resolveScoringRunItem` — resolución humana terminal-once de UNA excepción.
 *
 * - Solo items `proposed` con risk class `mandatory_review` | `quality_sample`; los
 *   `batch_eligible` se cubren por el confirm de run (o por el confirm individual
 *   existente de TASK-1361, que sigue disponible siempre).
 * - `confirmed`/`overridden` aplican el score VÍA `confirmAiProposal` (con `finalScore`
 *   solo cuando difiere = overridden); `rejected_to_manual` rechaza la proposal y la
 *   respuesta queda en la cola manual (`human_score` sigue NULL).
 * - `sawProposalBeforeScoring` es evidencia anti-anclaje OBLIGATORIA (ADR/Delta punto 9):
 *   queda en el item y en la historia append-only (`item_resolved`).
 * - Terminal-once: repetir la MISMA resolución es no-op idempotente; una resolución
 *   distinta sobre un item ya resuelto es 409.
 * - Digest stale (answer/pregunta cambió post-proposal) ⇒ el item queda `stale` (auditado)
 *   y el command responde 409: exige nueva propuesta/revisión, nunca aplica sobre inputs viejos.
 * - NO se gatea por flag: resolver excepciones es drenar la cola humana (como el confirm
 *   individual de TASK-1361).
 */
export const resolveScoringRunItem = async (
  input: ResolveScoringRunItemInput,
): Promise<ResolveScoringRunItemResult> => {
  if (!input.actorUserId) {
    throw new HiringValidationError('Falta el usuario que resuelve.', 'assessment_ai_run_missing_actor', 401)
  }

  if (!AI_SCORING_RUN_ITEM_RESOLUTIONS.includes(input.resolution)) {
    throw new HiringValidationError('La resolución no es válida.', 'assessment_ai_run_invalid_resolution', 400)
  }

  if (typeof input.sawProposalBeforeScoring !== 'boolean') {
    throw new HiringValidationError(
      'Falta declarar si el revisor vio la propuesta antes de puntuar.',
      'assessment_ai_run_missing_anchoring_evidence',
      400,
    )
  }

  if (input.resolution === 'overridden') {
    if (typeof input.finalScore !== 'number' || !Number.isFinite(input.finalScore) || input.finalScore < 0 || input.finalScore > 100) {
      throw new HiringValidationError(
        'Un override requiere un puntaje final entre 0 y 100.',
        'assessment_ai_run_invalid_final_score',
        400,
      )
    }
  }

  const outcome = await withGreenhousePostgresTransaction<ResolveOutcome>(async client => {
    const run = await lockScoringRunForUpdate(client, input.runId)

    assertRunReviewable(run)

    const item = await getRunItemInRun(client, input.runId, input.runItemId)
    const targetStatus = input.resolution === 'rejected_to_manual' ? 'rejected_to_manual' : 'confirmed'

    if (item.status !== 'proposed') {
      // Terminal-once: la MISMA resolución ya aplicada es no-op idempotente.
      if (item.status === targetStatus && item.resolution === input.resolution) {
        return { kind: 'noop', item }
      }

      if (item.resolution != null || item.status === 'confirmed' || item.status === 'rejected_to_manual') {
        throw new HiringValidationError(
          'El item ya fue resuelto; una resolución distinta no se puede re-aplicar.',
          'assessment_ai_run_item_already_resolved',
          409,
          { status: item.status, resolution: item.resolution },
        )
      }

      // Cualquier otro estado (pending/claimed/abstained/failed/stale/…) no es resoluble:
      // la state machine emite el 409 canónico.
      resolveItemTransition(item.status, targetStatus)

      throw new HiringValidationError(
        'El item no está en estado resoluble.',
        'assessment_ai_run_item_not_resolvable',
        409,
        { status: item.status },
      )
    }

    if (item.riskClass !== 'mandatory_review' && item.riskClass !== 'quality_sample') {
      throw new HiringValidationError(
        'Solo las excepciones mandatory_review o quality_sample se resuelven una a una; el resto se cubre con la confirmación del run.',
        'assessment_ai_run_item_not_exception',
        409,
        { riskClass: item.riskClass },
      )
    }

    if (!item.proposalId) {
      throw new HiringValidationError(
        'El item no tiene una propuesta asociada.',
        'assessment_ai_run_item_missing_proposal',
        409,
      )
    }

    // Staleness por item: la MISMA fórmula del propose (TASK-1383). Un digest distinto
    // significa que la respuesta/pregunta cambió post-proposal — jamás se aplica.
    const proposal = await requireAiProposalById(item.proposalId, client)
    const currentDigest = await computeCurrentResponseDigest(client, item.responseId)

    if (proposal.inputDigest && proposal.inputDigest !== currentDigest) {
      const stale = await transitionRunItem(client, item, 'stale', {
        actorUserId: input.actorUserId,
        reasonCode: 'input_digest_stale',
      })

      return { kind: 'stale', item: stale }
    }

    // Efecto downstream VÍA el command canónico de TASK-1361, en ESTA misma tx.
    await confirmAiProposal(
      {
        proposalId: item.proposalId,
        decision: input.resolution === 'rejected_to_manual' ? 'reject' : 'confirm',
        decisionNote: input.decisionNote,
        ...(input.resolution === 'overridden' ? { finalScore: input.finalScore } : {}),
      },
      input.actorUserId,
      client,
    )

    const resolved = await transitionRunItem(client, item, targetStatus, {
      actorUserId: input.actorUserId,
      reasonCode: `operator_${input.resolution}`,
      resolution: input.resolution,
      sawProposalBeforeScoring: input.sawProposalBeforeScoring,
    })

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringAssessmentAiScoringRun,
        aggregateId: run.runId,
        eventType: EVENT_TYPES.hiringAssessmentAiRunItemResolved,
        payload: {
          runId: run.runId,
          runItemId: resolved.runItemId,
          resolution: input.resolution,
          sawProposalBeforeScoring: input.sawProposalBeforeScoring,
          actorUserId: input.actorUserId,
        },
      },
      client,
    )

    return { kind: 'applied', item: resolved }
  })

  if (outcome.kind === 'stale') {
    // La transición a `stale` YA quedó commiteada + auditada; el 409 es el contrato del caller.
    throw new HiringValidationError(
      'La propuesta quedó desactualizada (la respuesta o la pregunta cambiaron); se requiere una nueva propuesta.',
      'assessment_ai_run_item_stale',
      409,
    )
  }

  return { item: outcome.item, applied: outcome.kind === 'applied' }
}

// ── Confirmación del run por lote ──

const ASSESSMENT_CONFIRMABLE_STATUSES = ['in_progress', 'submitted'] as const

/**
 * Command `confirmAssessmentAiScoringRun` — la confirmación humana gobernada del conjunto
 * `batch_eligible` restante (ADR D1). Gates verificados DENTRO de la tx, bajo `FOR UPDATE`:
 *
 * 1. Run en estado de revisión (`awaiting_review`|`confirmable`); `confirmed` es no-op
 *    idempotente SIN re-aplicar efectos ni manifest nuevo; `cancelled`/`failed` ⇒ 409.
 * 2. Cero items en scoring, cero `mandatory_review` sin resolver, muestra ciega completa.
 *    Estos SIEMPRE aplican: miden si el trabajo humano terminó, no si se aplica algo.
 *
 * Y tres gates que aplican SÓLO cuando queda lote por aplicar (`batch.length > 0`), porque
 * protegen exactamente eso —que una proposal de la IA entre a `human_score` cuando no debe—
 * y con cero proposals pendientes no protegen nada:
 *
 * 3. Flag `HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED` ON (Vercel; OFF ⇒ 409 estable).
 * 4. El assessment NO está `scored` ni terminal.
 * 5. Digest vigente contra el digest inmutable del run; stale ⇒ 409.
 *
 * Ese reordenamiento es el fix del caso 2026-08-19: dos runs con el 100% de sus ítems ya
 * resueltos uno a uno por un humano quedaron incerrables. El `SELECT ... FOR UPDATE` sobre el
 * assessment se conserva incondicional (serializa contra `finalizeAssessment`), y los hechos que
 * dejaron de bloquear quedan REGISTRADOS en el manifest (`digestStaleAtClose`,
 * `assessmentStatusAtClose`, `closureMode`), nunca en silencio.
 *
 * Con los gates cerrados aplica las proposals `batch_eligible` restantes ATÓMICAMENTE vía
 * `confirmAiProposal` (canónico TASK-1361/1360, cero bypass), escribe el MANIFEST
 * append-only (`run_confirm_manifest` en la historia del run: proposals cubiertas, muestra
 * revisada, excepciones resueltas con su evidencia anti-anclaje, devueltos a manual,
 * actor, policy/model/prompt/input digests) y transiciona el run a `confirmed`.
 *
 * NOTA DELIBERADA: si el assessment queda sin respuestas pendientes, este command NO
 * auto-finaliza — `finalizeAssessment` sigue siendo una decisión humana del flujo
 * existente (TASK-1360). El run confirma scores; no cierra evaluaciones.
 */
export const confirmAssessmentAiScoringRun = async (
  input: ConfirmAssessmentAiScoringRunInput,
): Promise<ConfirmAssessmentAiScoringRunResult> => {
  if (!input.actorUserId) {
    throw new HiringValidationError('Falta el usuario que confirma.', 'assessment_ai_run_missing_actor', 401)
  }

  return withGreenhousePostgresTransaction(async client => {
    const run = await lockScoringRunForUpdate(client, input.runId)

    // Terminal-once: re-confirmar un run ya confirmado es no-op idempotente (sin manifest
    // nuevo, sin re-aplicar proposals). cancelled/failed → 409 vía la state machine.
    if (run.status === 'confirmed') {
      return {
        run,
        items: await listRunItems(run.runId, client),
        appliedProposals: 0,
        alreadyConfirmed: true,
      }
    }

    if (run.status === 'cancelled' || run.status === 'failed') {
      resolveRunTransition(run.status, 'confirmed')
    }

    assertRunReviewable(run)

    // Guard: nunca reescribir un assessment ya scored/terminal.
    const assessmentRows = await client.query(
      `SELECT status FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1 FOR UPDATE`,
      [run.assessmentId],
    )

    // El `FOR UPDATE` de arriba se conserva SIEMPRE: serializa contra `finalizeAssessment`.
    // El throw, en cambio, se evalúa más abajo y sólo si hay lote que aplicar (ver §gates).
    const assessmentStatus = String((assessmentRows.rows[0] as { status?: unknown } | undefined)?.status ?? '')

    const items = await listRunItems(run.runId, client)

    const scoringPending = items.filter(i => i.status === 'pending' || i.status === 'claimed')

    if (scoringPending.length > 0) {
      throw new HiringValidationError(
        'El run todavía tiene items en scoring.',
        'assessment_ai_run_scoring_incomplete',
        409,
        { pending: scoringPending.length },
      )
    }

    // Fail-closed: un item `proposed` sin clase de riesgo cuenta como mandatory pendiente.
    const mandatoryPending = items.filter(
      i => i.status === 'proposed' && (i.riskClass === 'mandatory_review' || i.riskClass == null),
    )

    if (mandatoryPending.length > 0) {
      throw new HiringValidationError(
        'Quedan excepciones mandatory_review sin resolver.',
        'assessment_ai_run_mandatory_pending',
        409,
        { pending: mandatoryPending.length },
      )
    }

    const samplePending = items.filter(i => i.status === 'proposed' && i.riskClass === 'quality_sample')

    if (samplePending.length > 0) {
      throw new HiringValidationError(
        'La muestra ciega de calidad está incompleta.',
        'assessment_ai_run_sample_incomplete',
        409,
        { pending: samplePending.length },
      )
    }

    // Vigencia de digests (policy/model/prompt/answers/rubric): recomputar HOY y comparar.
    // Se computa SIEMPRE porque es un hecho que el manifest debe registrar, aunque no bloquee.
    const currentDigest = await computeCurrentScoringRunDigest(
      run.assessmentId,
      items.map(i => i.responseId),
      client,
    )

    const digestStaleAtClose = currentDigest !== run.inputDigest

    const batch = items.filter(i => i.status === 'proposed' && i.riskClass === 'batch_eligible' && i.proposalId)

    // ── Gates que protegen la APLICACIÓN de puntajes ──
    //
    // Los tres de abajo (flag, assessment escribible, digest vigente) existen para una sola cosa:
    // impedir que proposals de la IA entren a `human_score` cuando no corresponde. Si no queda NADA
    // que aplicar, no protegen nada — y su efecto real era dejar el run estructuralmente incerrable.
    //
    // Caso fuente 2026-08-19: dos runs productivos con el 100% de sus ítems resueltos UNO A UNO por
    // un humano quedaron atrapados en `awaiting_review`. El operador hizo todo el trabajo por el
    // único camino abierto (`resolveScoringRunItem`, que nunca se gateó) y el sistema no le dejaba
    // guardarlo. Uno de los dos además quedó stale para siempre porque la policy cambió después.
    //
    // Los gates NO se relajan: cuando hay lote, los tres siguen siendo exactamente igual de duros.
    if (batch.length > 0) {
      if (!isHiringAssessmentAiRunConfirmEnabled()) {
        throw new HiringValidationError(
          'La confirmación de runs de scoring está deshabilitada.',
          'assessment_ai_run_confirm_disabled',
          409,
        )
      }

      if (!(ASSESSMENT_CONFIRMABLE_STATUSES as readonly string[]).includes(assessmentStatus)) {
        throw new HiringValidationError(
          'El assessment ya fue finalizado o cerrado; el run no puede reescribirlo.',
          'assessment_ai_run_assessment_not_writable',
          409,
          { assessmentStatus },
        )
      }

      if (digestStaleAtClose) {
        throw new HiringValidationError(
          'El run quedó desactualizado (answers, rubric, modelo, prompt o policy cambiaron); se requiere un run nuevo.',
          'assessment_ai_run_stale',
          409,
        )
      }
    }

    // Aplicar el lote restante vía el confirm canónico (misma tx; secuencial a propósito —
    // un PoolClient dentro de una tx no paraleliza queries).
    const confirmedItems: AiScoringRunItem[] = []

    for (const item of batch) {
      await confirmAiProposal(
        { proposalId: item.proposalId as string, decision: 'confirm', decisionNote: input.decisionNote },
        input.actorUserId,
        client,
      )

      confirmedItems.push(
        await transitionRunItem(client, item, 'confirmed', {
          actorUserId: input.actorUserId,
          reasonCode: 'run_batch_confirmed',
        }),
      )
    }

    // Manifest append-only (ADR D1): HECHOS estructurados — IDs, digests, reason codes,
    // resoluciones, evidencia anti-anclaje `sawProposalBeforeScoring` por item humano,
    // actor. NUNCA texto de respuesta, score crudo del candidato ni PII. La narrativa
    // libre del revisor vive en el expediente de TASK-1735 (ADR D7), no acá.
    const manifestExceptions = items
      .filter(i => i.riskClass === 'mandatory_review' && i.resolution != null)
      .map(i => ({
        runItemId: i.runItemId,
        proposalId: i.proposalId,
        resolution: i.resolution,
        sawProposalBeforeScoring: i.sawProposalBeforeScoring,
        resolvedBy: i.resolvedBy,
        resolvedAt: i.resolvedAt,
      }))

    const manifestSample = items
      .filter(i => i.riskClass === 'quality_sample' && i.resolution != null)
      .map(i => ({
        runItemId: i.runItemId,
        proposalId: i.proposalId,
        resolution: i.resolution,
        sawProposalBeforeScoring: i.sawProposalBeforeScoring,
        resolvedBy: i.resolvedBy,
        resolvedAt: i.resolvedAt,
      }))

    await insertRunEvent(client, {
      runId: run.runId,
      eventType: 'run_confirm_manifest',
      fromStatus: run.status,
      toStatus: 'confirmed',
      actorUserId: input.actorUserId,
      detail: {
        // Un cierre sin lote NO es una confirmación por lote: se distingue para que el manifest
        // siga siendo evidencia y no decoración. `digestStaleAtClose` y `assessmentStatusAtClose`
        // registran los hechos que dejaron de bloquear cuando no hay nada que aplicar.
        closureMode: confirmedItems.length > 0 ? 'batch_confirmed' : 'settled_without_batch',
        digestStaleAtClose,
        assessmentStatusAtClose: assessmentStatus,
        assessmentId: run.assessmentId,
        applicationId: run.applicationId,
        inputDigest: run.inputDigest,
        model: run.model,
        promptVersion: run.promptVersion,
        policyVersion: run.policyVersion,
        batchConfirmed: confirmedItems.map(i => ({
          runItemId: i.runItemId,
          responseId: i.responseId,
          proposalId: i.proposalId,
        })),
        exceptionsResolved: manifestExceptions,
        sampleReviewed: manifestSample,
        returnedToManual: items
          .filter(i => ['abstained', 'failed', 'rejected_to_manual'].includes(i.status))
          .map(i => ({ runItemId: i.runItemId, status: i.status, reasonCode: i.reasonCode })),
        closedWithoutProposal: items
          .filter(i => ['stale', 'superseded_by_manual', 'cancelled'].includes(i.status))
          .map(i => ({ runItemId: i.runItemId, status: i.status, reasonCode: i.reasonCode })),
        decisionNote: input.decisionNote ?? null,
        actorUserId: input.actorUserId,
      },
    })

    // Transición gobernada: awaiting_review → confirmable → confirmed (ambas auditadas).
    let settled = run

    if (settled.status === 'awaiting_review') {
      settled = await transitionScoringRun(client, settled, 'confirmable', { actorUserId: input.actorUserId })
    }

    settled = await transitionScoringRun(client, settled, 'confirmed', {
      actorUserId: input.actorUserId,
      reasonCode: confirmedItems.length > 0 ? 'run_confirmed' : 'run_closed_without_batch',
    })

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.hiringAssessmentAiScoringRun,
        aggregateId: settled.runId,
        eventType: EVENT_TYPES.hiringAssessmentAiRunConfirmed,
        payload: {
          runId: settled.runId,
          assessmentId: settled.assessmentId,
          applicationId: settled.applicationId,
          appliedProposals: confirmedItems.length,
          exceptionsResolved: manifestExceptions.length,
          sampleReviewed: manifestSample.length,
          actorUserId: input.actorUserId,
        },
      },
      client,
    )

    const finalItems = await listRunItems(run.runId, client)

    return {
      run: settled,
      items: finalItems,
      appliedProposals: confirmedItems.length,
      alreadyConfirmed: false,
    }
  })
}
