import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import type { AiScoringRun, AiScoringRunItem, AiScoringRunStatus } from '@/types/hiring-assessment-ai-run'
import type { ResponseScoreProposal } from '@/types/hiring-assessment-ai'

import { HiringValidationError } from '../../../errors'
import { isHiringAssessmentAiEnabled } from '../config'
import { proposeScoreForResponse } from '../score-response'
import {
  getAiRunFanOutConfig,
  getAiRunRiskPolicyConfig,
  isHiringAssessmentAiExceptionPolicyEnabled,
  isHiringAssessmentAiRunEnqueueEnabled,
} from './config'
import { listEligibleResponses } from './commands'
import { routeScoredItem, type AiRiskRoutingReason } from './risk-router'
import {
  claimScoringRunLease,
  countAssessmentAiProviderAttemptsSince,
  insertRunItems,
  listClaimableScoringRunIds,
  listRunItems,
  lockScoringRunForUpdate,
  releaseScoringRunLease,
  transitionRunItem,
  transitionScoringRun,
} from './store'

// TASK-1734 Slice 2 — Fan-out de scoring del drain (ADR D4). Este módulo corre SOLO en el
// ops-worker vía el drain endpoint: NUNCA inline en un route handler Vercel ni dentro del
// cuerpo de una proyección reactiva. Invoca el scorer canónico `proposeScoreForResponse`
// (TASK-1361 sigue dueña del proposal ledger, prompt y provider — acá NO se re-implementa
// nada de eso) con bounded concurrency, timeout por item, retry acotado y cost cap por run.
// Fail-closed: todo item que no termina en proposal queda `abstained`/`failed` con reason
// code estable — NUNCA desaparece de la cola manual.

const DRAIN_ACTOR = 'system:assessment-ai-scoring-drain'

// ── Summaries ──

export interface ExecuteScoringRunSummary {
  runId: string
  status: AiScoringRunStatus
  processed: number
  proposed: number
  abstained: number
  failed: number
  supersededByManual: number
  remainingPending: number
  providerAttempts: number
  skipped: string | null
}

export interface DrainAssessmentAiScoringRunsSummary {
  candidates: number
  claimed: number
  busy: number
  runs: ExecuteScoringRunSummary[]
  /**
   * Runs reclamados cuya ejecución explotó en ESTE tick (observados vía Sentry, lease
   * liberada). El drain sigue con los demás — un run venenoso jamás bloquea el tick.
   */
  failedRuns: string[]
  skipped: string | null
  dailyProviderAttempts: number
  dailyAttemptCap: number
}

// ── Helpers puros ──

const MAX_ANSWER_CHARS = 6000

/**
 * Extracción allowlist del texto de respuesta (espejo del scorer TASK-1361): SOLO
 * `answer.text`/`answer.value` string. Cualquier otra forma es `malformed` — el router
 * la enruta a revisión manual y el drain NO gasta provider en ella.
 */
const resolveAnswer = (answerJson: unknown): { text: string; malformed: boolean } => {
  const answer = (answerJson ?? {}) as Record<string, unknown>

  if (typeof answer.text === 'string') return { text: answer.text.slice(0, MAX_ANSWER_CHARS), malformed: false }
  if (typeof answer.value === 'string') return { text: answer.value.slice(0, MAX_ANSWER_CHARS), malformed: false }

  return { text: '', malformed: true }
}

class ItemTimeoutError extends Error {
  constructor(ms: number) {
    super(`El scoring del item excedió el timeout de ${ms}ms.`)
    this.name = 'ItemTimeoutError'
  }
}

const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ItemTimeoutError(ms)), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** Pool de workers acotado (bounded concurrency): jamás más de `limit` items en vuelo. */
const runBounded = async <T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> => {
  const queue = [...items]

  const lane = async (): Promise<void> => {
    for (;;) {
      const next = queue.shift()

      if (next === undefined) return

      await worker(next)
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, lane))
}

// ── Contexto por item (batch read, fuera de tx) ──

interface ItemContextRow extends Record<string, unknown> {
  response_id: unknown
  answer_json: unknown
  rubric_json: unknown
  human_score: unknown
  competency_weight: unknown
}

const loadItemContexts = async (responseIds: string[]): Promise<Map<string, ItemContextRow>> => {
  if (responseIds.length === 0) return new Map()

  const rows = await runGreenhousePostgresQuery<ItemContextRow>(
    `SELECT r.response_id, r.answer_json, q.rubric_json, r.human_score,
            m.weight AS competency_weight
       FROM greenhouse_hiring.hiring_assessment_response r
       JOIN greenhouse_hiring.hiring_question q ON q.question_id = r.question_id
       JOIN greenhouse_hiring.hiring_assessment a ON a.assessment_id = r.assessment_id
       LEFT JOIN greenhouse_hiring.hiring_assessment_template_module m
         ON m.template_id = a.template_id AND m.competency_id = r.competency_id
      WHERE r.response_id = ANY($1::text[])`,
    [responseIds],
  )

  return new Map(rows.map(row => [String(row.response_id), row]))
}

// ── Outcome del fan-out por item ──

type ItemOutcome =
  | { kind: 'proposed'; proposalId: string; riskClass: 'mandatory_review' | 'quality_sample' | 'batch_eligible'; reasons: AiRiskRoutingReason[]; attempts: number }
  | { kind: 'abstained'; reasonCode: string; reasons: AiRiskRoutingReason[]; attempts: number }
  | { kind: 'failed'; reasonCode: string; attempts: number }
  | { kind: 'superseded_by_manual'; attempts: number }

const scoreOneItem = async (
  run: AiScoringRun,
  item: AiScoringRunItem,
  ctx: ItemContextRow | undefined,
  opts: {
    itemTimeoutMs: number
    maxRetriesPerItem: number
    exceptionPolicyEnabled: boolean
    consumeBudget: () => boolean
  },
): Promise<ItemOutcome> => {
  if (!ctx) {
    // La respuesta no existe/ya no resuelve contexto: fail-closed a la cola manual.
    return { kind: 'failed', reasonCode: 'response_context_missing', attempts: 0 }
  }

  if (ctx.human_score != null) {
    // El carril manual llegó primero (Delta punto 3): el item se cierra auditado, sin gasto.
    return { kind: 'superseded_by_manual', attempts: 0 }
  }

  const { text: answerText, malformed } = resolveAnswer(ctx.answer_json)

  // Sin texto usable no hay nada que mandar al provider: abstención sin gasto (fail-closed).
  if (malformed) {
    return { kind: 'abstained', reasonCode: 'answer_malformed', reasons: ['answer_malformed'], attempts: 0 }
  }

  if (answerText.trim().length === 0) {
    return { kind: 'abstained', reasonCode: 'answer_empty', reasons: ['answer_empty'], attempts: 0 }
  }

  const maxAttempts = 1 + opts.maxRetriesPerItem
  let attempts = 0
  let lastFailure: { kind: 'abstained' | 'failed'; reasonCode: string } = { kind: 'failed', reasonCode: 'provider_error' }

  while (attempts < maxAttempts) {
    if (!opts.consumeBudget()) {
      // Cost cap del run agotado: el item vuelve a la cola manual con reason estable.
      if (attempts === 0) return { kind: 'failed', reasonCode: 'run_cost_cap_exceeded', attempts }

      return lastFailure.kind === 'abstained'
        ? { kind: 'abstained', reasonCode: lastFailure.reasonCode, reasons: [], attempts }
        : { kind: 'failed', reasonCode: lastFailure.reasonCode, attempts }
    }

    attempts += 1

    try {
      const result = await withTimeout(proposeScoreForResponse(item.responseId, DRAIN_ACTOR), opts.itemTimeoutMs)

      if (result.status === 'ok' && result.proposal && result.suggested) {
        const routed = routeScoredItem({
          runId: run.runId,
          responseId: item.responseId,
          answerText,
          answerMalformed: false,
          rubric: (ctx.rubric_json ?? null) as Record<string, unknown> | null,
          competencyWeight: ctx.competency_weight == null ? null : Number(ctx.competency_weight),
          proposal: result.suggested as ResponseScoreProposal,
          inputSafetyReasons: result.inputSafetyReasons,
          exceptionPolicyEnabled: opts.exceptionPolicyEnabled,
          policy: getAiRunRiskPolicyConfig(),
        })

        return {
          kind: 'proposed',
          proposalId: result.proposal.proposalId,
          riskClass: routed.riskClass,
          reasons: routed.reasons,
          attempts,
        }
      }

      if (result.status === 'not_configured') {
        // Configuración ausente no es transitoria: reintentar no ayuda.
        return { kind: 'failed', reasonCode: 'provider_not_configured', attempts }
      }

      if (result.status === 'input_blocked') {
        return {
          kind: 'abstained',
          reasonCode: 'input_safety_blocked',
          reasons: result.inputSafetyReasons,
          attempts,
        }
      }

      // `schema_invalid` (salida malformada del LLM) es retryable; agotado ⇒ abstención.
      // `provider_error` es retryable; agotado ⇒ failed.
      lastFailure =
        result.status === 'schema_invalid'
          ? { kind: 'abstained', reasonCode: 'schema_invalid' }
          : { kind: 'failed', reasonCode: 'provider_error' }
    } catch (error) {
      lastFailure =
        error instanceof ItemTimeoutError
          ? { kind: 'failed', reasonCode: 'item_timeout' }
          : { kind: 'failed', reasonCode: 'provider_exception' }
    }
  }

  return lastFailure.kind === 'abstained'
    ? { kind: 'abstained', reasonCode: lastFailure.reasonCode, reasons: [], attempts }
    : { kind: 'failed', reasonCode: lastFailure.reasonCode, attempts }
}

// ── Ejecución de UN run reclamado ──

/**
 * Ejecuta el fan-out de un run cuya lease YA fue reclamada por este drain.
 *
 * Fase 1 (tx): lock del run, self-heal de enumeración si quedó `enumerating`
 * (re-enumera SOLO respuestas elegibles del assessment exacto; `ON CONFLICT DO NOTHING`
 * hace la re-enumeración idempotente), recuperación de items `claimed` huérfanos de un
 * drain muerto (lease vencida ⇒ vuelven a `pending`), aplicación del cost cap
 * (sin presupuesto ⇒ `failed` con `run_cost_cap_exceeded`, nunca un item perdido) y
 * claim del batch (`pending → claimed`).
 *
 * Fase 2 (SIN tx): fan-out con bounded concurrency + timeout + retry acotado, vía el
 * scorer canónico de TASK-1361.
 *
 * Fase 3 (tx): settle — transición por item con proposal/risk_class/routing_reasons +
 * attempt_count, cierre del run a `awaiting_review` cuando no queda trabajo, y release
 * de la lease.
 */
export const executeClaimedScoringRun = async (run: AiScoringRun): Promise<ExecuteScoringRunSummary> => {
  const fanOut = getAiRunFanOutConfig()
  const exceptionPolicyEnabled = isHiringAssessmentAiExceptionPolicyEnabled()

  const emptySummary = (status: AiScoringRunStatus, skipped: string | null): ExecuteScoringRunSummary => ({
    runId: run.runId,
    status,
    processed: 0,
    proposed: 0,
    abstained: 0,
    failed: 0,
    supersededByManual: 0,
    remainingPending: 0,
    providerAttempts: 0,
    skipped,
  })

  // ── Fase 1: preparación transaccional ──
  const prep = await withGreenhousePostgresTransaction(async client => {
    const locked = await lockScoringRunForUpdate(client, run.runId)

    if (locked.status !== 'enumerating' && locked.status !== 'scoring') {
      await releaseScoringRunLease(run.runId, run.leaseOwner ?? '', client)

      return { skip: `run_not_drainable:${locked.status}` as string | null, batch: [] as AiScoringRunItem[], status: locked.status, budget: 0 }
    }

    let current = locked

    if (current.status === 'enumerating') {
      // Self-heal: enumeración interrumpida. SOLO respuestas pendientes del assessment exacto.
      const eligible = await listEligibleResponses(current.assessmentId, client)

      await insertRunItems(client, current, eligible.map(r => String(r.response_id)))

      const hasItems = (await listRunItems(current.runId, client)).length > 0

      current = await transitionScoringRun(client, current, hasItems ? 'scoring' : 'awaiting_review', {
        actorUserId: DRAIN_ACTOR,
        reasonCode: hasItems ? null : 'no_eligible_items',
      })

      if (current.status === 'awaiting_review') {
        await releaseScoringRunLease(run.runId, run.leaseOwner ?? '', client)

        return { skip: 'no_eligible_items' as string | null, batch: [] as AiScoringRunItem[], status: current.status, budget: 0 }
      }
    }

    const items = await listRunItems(current.runId, client)

    // Recovery de un drain muerto: items `claimed` con la lease del run ya vencida/nuestra
    // vuelven a `pending` (la state machine lo permite; historia append-only lo audita).
    const recovered: AiScoringRunItem[] = []

    for (const item of items) {
      recovered.push(
        item.status === 'claimed'
          ? await transitionRunItem(client, item, 'pending', {
              actorUserId: DRAIN_ACTOR,
              reasonCode: 'reclaimed_after_lease_expiry',
            })
          : item,
      )
    }

    const pending = recovered.filter(i => i.status === 'pending')
    const attemptsUsed = recovered.reduce((acc, i) => acc + i.attemptCount, 0)
    const budget = Math.max(0, fanOut.maxProviderAttemptsPerRun - attemptsUsed)

    // Cost cap agotado: fail-closed — los pendientes caen a la cola manual con reason
    // estable, jamás quedan en un limbo que el próximo drain tampoco podría pagar.
    if (budget === 0 && pending.length > 0) {
      for (const item of pending) {
        await transitionRunItem(client, item, 'failed', {
          actorUserId: DRAIN_ACTOR,
          reasonCode: 'run_cost_cap_exceeded',
          riskClass: 'mandatory_review',
        })
      }

      const settled = await transitionScoringRun(client, current, 'awaiting_review', {
        actorUserId: DRAIN_ACTOR,
        reasonCode: 'run_cost_cap_exceeded',
      })

      await releaseScoringRunLease(run.runId, run.leaseOwner ?? '', client)

      return { skip: 'run_cost_cap_exceeded' as string | null, batch: [] as AiScoringRunItem[], status: settled.status, budget: 0 }
    }

    const batch: AiScoringRunItem[] = []

    for (const item of pending) {
      batch.push(await transitionRunItem(client, item, 'claimed', { actorUserId: DRAIN_ACTOR }))
    }

    return { skip: null as string | null, batch, status: current.status, budget }
  })

  if (prep.skip || prep.batch.length === 0) {
    // Los skip paths internos de la tx ya liberaron la lease; el caso "sin pendientes"
    // la libera acá para no dejar el run tomado hasta que la lease venza sola.
    if (!prep.skip) {
      await releaseScoringRunLease(run.runId, run.leaseOwner ?? '')
    }

    return emptySummary(prep.status, prep.skip ?? 'no_pending_items')
  }

  // ── Fase 2: fan-out fuera de tx (bounded concurrency + budget compartido) ──
  const contexts = await loadItemContexts(prep.batch.map(i => i.responseId))
  const outcomes = new Map<string, ItemOutcome>()

  let budgetLeft = prep.budget ?? fanOut.maxProviderAttemptsPerRun

  const consumeBudget = (): boolean => {
    if (budgetLeft <= 0) return false
    budgetLeft -= 1

    return true
  }

  await runBounded(prep.batch, fanOut.concurrency, async item => {
    const outcome = await scoreOneItem(run, item, contexts.get(item.responseId), {
      itemTimeoutMs: fanOut.itemTimeoutMs,
      maxRetriesPerItem: fanOut.maxRetriesPerItem,
      exceptionPolicyEnabled,
      consumeBudget,
    })

    outcomes.set(item.runItemId, outcome)
  })

  // ── Fase 3: settle transaccional + release de lease ──
  return withGreenhousePostgresTransaction(async client => {
    const locked = await lockScoringRunForUpdate(client, run.runId)

    const summary = emptySummary('scoring', null)

    for (const item of prep.batch) {
      const outcome = outcomes.get(item.runItemId)

      if (!outcome) continue

      summary.processed += 1
      summary.providerAttempts += outcome.attempts

      if (outcome.kind === 'proposed') {
        summary.proposed += 1
        await transitionRunItem(client, item, 'proposed', {
          actorUserId: DRAIN_ACTOR,
          proposalId: outcome.proposalId,
          riskClass: outcome.riskClass,
          routingReasons: outcome.reasons,
          attemptDelta: outcome.attempts,
        })
      } else if (outcome.kind === 'abstained') {
        summary.abstained += 1
        await transitionRunItem(client, item, 'abstained', {
          actorUserId: DRAIN_ACTOR,
          reasonCode: outcome.reasonCode,
          riskClass: 'mandatory_review',
          routingReasons: outcome.reasons.length > 0 ? outcome.reasons : null,
          attemptDelta: outcome.attempts,
        })
      } else if (outcome.kind === 'superseded_by_manual') {
        summary.supersededByManual += 1
        await transitionRunItem(client, item, 'superseded_by_manual', {
          actorUserId: DRAIN_ACTOR,
          reasonCode: 'human_score_applied',
          attemptDelta: outcome.attempts,
        })
      } else {
        summary.failed += 1
        await transitionRunItem(client, item, 'failed', {
          actorUserId: DRAIN_ACTOR,
          reasonCode: outcome.reasonCode,
          riskClass: 'mandatory_review',
          attemptDelta: outcome.attempts,
        })
      }
    }

    const after = await listRunItems(run.runId, client)
    const remaining = after.filter(i => i.status === 'pending' || i.status === 'claimed')

    summary.remainingPending = remaining.length

    if (remaining.length === 0) {
      const settled = await transitionScoringRun(client, locked, 'awaiting_review', {
        actorUserId: DRAIN_ACTOR,
        reasonCode: 'scoring_complete',
      })

      summary.status = settled.status
    }

    await releaseScoringRunLease(run.runId, run.leaseOwner ?? '', client)

    return summary
  })
}

// ── Drain multi-run (endpoint ops-worker) ──

/**
 * Drena runs `enumerating|scoring` con claim atómico por lease (conditional UPDATE,
 * patrón TASK-1664): dos drains concurrentes NUNCA procesan el mismo run — el perdedor
 * cuenta `busy` y sigue. Doble gate de flags (enqueue del ADR D6 + master de TASK-1361,
 * ambos leídos en ESTE runtime): OFF ⇒ 409 estable, cero claims, cero gasto.
 */
export const drainAssessmentAiScoringRuns = async (
  opts: { maxRuns?: number; drainOwner?: string } = {},
): Promise<DrainAssessmentAiScoringRunsSummary> => {
  if (!isHiringAssessmentAiRunEnqueueEnabled()) {
    throw new HiringValidationError(
      'El scoring asíncrono por assessment está deshabilitado.',
      'assessment_ai_run_enqueue_disabled',
      409,
    )
  }

  if (!isHiringAssessmentAiEnabled()) {
    // El master de TASK-1361 gatea el propose path del scorer y se lee en ESTE runtime
    // (regla multi-runtime del ledger): sin él, el drain no reclama ni gasta.
    throw new HiringValidationError(
      'La asistencia de IA de evaluación está deshabilitada en este runtime.',
      'assessment_ai_disabled',
      409,
    )
  }

  const fanOut = getAiRunFanOutConfig()
  const maxRuns = Math.max(1, Math.min(20, Math.floor(opts.maxRuns ?? 5)))
  const drainOwner = opts.drainOwner ?? `${DRAIN_ACTOR}:${process.pid}`

  const dailyProviderAttempts = await countAssessmentAiProviderAttemptsSince(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
  )

  if (dailyProviderAttempts >= fanOut.maxProviderAttemptsPerDay) {
    return {
      candidates: 0,
      claimed: 0,
      busy: 0,
      runs: [],
      failedRuns: [],
      skipped: 'daily_cost_cap_exceeded',
      dailyProviderAttempts,
      dailyAttemptCap: fanOut.maxProviderAttemptsPerDay,
    }
  }

  const candidates = await listClaimableScoringRunIds(maxRuns)

  const summary: DrainAssessmentAiScoringRunsSummary = {
    candidates: candidates.length,
    claimed: 0,
    busy: 0,
    runs: [],
    failedRuns: [],
    skipped: null,
    dailyProviderAttempts,
    dailyAttemptCap: fanOut.maxProviderAttemptsPerDay,
  }

  for (const runId of candidates) {
    const claimed = await claimScoringRunLease(runId, drainOwner, fanOut.leaseSeconds)

    if (!claimed) {
      summary.busy += 1
      continue
    }

    summary.claimed += 1

    try {
      summary.runs.push(await executeClaimedScoringRun(claimed))
    } catch (error) {
      // Anti head-of-line blocking (auditoría 2026-08-16): un run que explota NO aborta el
      // tick — se observa en Sentry, se registra como fallido en el summary y el loop
      // CONTINÚA con los demás runs. Antes acá había un `throw` que convertía al run
      // venenoso (primero por created_at ASC) en starvation determinista de todo el drain.
      // La lease se libera para que el próximo tick lo retome (los items claimed se
      // recuperan vía reclaimed_after_lease_expiry).
      captureWithDomain(error, 'hiring', {
        tags: { source: 'assessment_ai_scoring_drain', run_id: runId },
      })
      summary.failedRuns.push(runId)
      await releaseScoringRunLease(runId, drainOwner).catch(() => undefined)
    }
  }

  return summary
}
