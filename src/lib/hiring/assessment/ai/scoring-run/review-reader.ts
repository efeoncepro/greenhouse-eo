import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type {
  AiScoringRiskClass,
  AiScoringRunItemResolution,
  AiScoringRunItemStatus,
  AssessmentAiReviewItem,
  AssessmentAiRunReview,
  AssessmentAiRunReviewCoverage,
} from '@/types/hiring-assessment-ai-run'

import { HiringNotFoundError, HiringValidationError } from '../../../errors'
import { computeCurrentScoringRunDigest } from './commands'
import { getScoringRunById } from './store'

// TASK-1734 Slice 4 — Reader OPERATOR-ONLY de revisión del run (exact-scoped por runId;
// reemplaza el patrón "lista global LIMIT 50 + filtro client-side" — Delta punto 7).
// El DTO NUNCA retorna campos de identidad del candidato (nombre/contacto/CV): solo IDs
// de lineage + textos de pregunta/respuesta necesarios para revisar + la evidencia del
// proposal con su provenance (digests/model/prompt). El resultado es exclusivamente
// interno: jamás alimenta un payload público, candidate-facing ni email.

const MAX_ANSWER_CHARS = 6000

/** Allowlist de texto de respuesta para el DTO de revisión (espejo del drain: text|value). */
const reviewAnswerText = (answerJson: unknown): string => {
  const answer = (answerJson ?? {}) as Record<string, unknown>

  if (typeof answer.text === 'string') return answer.text.slice(0, MAX_ANSWER_CHARS)
  if (typeof answer.value === 'string') return answer.value.slice(0, MAX_ANSWER_CHARS)

  return ''
}

interface ReviewItemRow extends Record<string, unknown> {
  run_item_id: unknown
  response_id: unknown
  status: unknown
  risk_class: unknown
  reason_code: unknown
  routing_reasons: unknown
  attempt_count: unknown
  resolution: unknown
  saw_proposal_before_scoring: unknown
  resolved_by: unknown
  resolved_at: unknown
  question_prompt: unknown
  question_type: unknown
  answer_json: unknown
  proposal_id: unknown
  proposal_status: unknown
  proposed_json: unknown
  provider: unknown
  model: unknown
  prompt_version: unknown
  proposal_input_digest: unknown
}

const str = (v: unknown): string => (v == null ? '' : String(v))
const nstr = (v: unknown): string | null => (v == null ? null : String(v))
const ts = (v: unknown): string | null => (v == null ? null : v instanceof Date ? v.toISOString() : String(v))

const jsonVal = (v: unknown): Record<string, unknown> => {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>

  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v)

      if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>
    } catch {
      return {}
    }
  }

  return {}
}

const strArray = (v: unknown): string[] => {
  const parsed = typeof v === 'string' ? (() => { try { return JSON.parse(v) } catch { return [] } })() : v

  return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
}

const normalizeReviewItem = (row: ReviewItemRow): AssessmentAiReviewItem => {
  const proposalId = nstr(row.proposal_id)
  const proposed = jsonVal(row.proposed_json)

  const perCriterion = Array.isArray(proposed.perCriterion)
    ? proposed.perCriterion.flatMap(entry => {
        if (!entry || typeof entry !== 'object') return []

        const c = entry as Record<string, unknown>

        if (typeof c.criterion !== 'string' || typeof c.score !== 'number') return []

        return [{ criterion: c.criterion, score: c.score, ...(typeof c.note === 'string' ? { note: c.note } : {}) }]
      })
    : []

  return {
    runItemId: str(row.run_item_id),
    responseId: str(row.response_id),
    status: str(row.status) as AiScoringRunItemStatus,
    riskClass: (nstr(row.risk_class) as AiScoringRiskClass | null) ?? null,
    routingReasons: strArray(row.routing_reasons),
    reasonCode: nstr(row.reason_code),
    attemptCount: Number(row.attempt_count ?? 0) || 0,
    resolution: (nstr(row.resolution) as AiScoringRunItemResolution | null) ?? null,
    sawProposalBeforeScoring: row.saw_proposal_before_scoring == null ? null : Boolean(row.saw_proposal_before_scoring),
    resolvedBy: nstr(row.resolved_by),
    resolvedAt: ts(row.resolved_at),
    questionPrompt: str(row.question_prompt),
    questionType: str(row.question_type),
    answerText: reviewAnswerText(row.answer_json),
    proposal: proposalId
      ? {
          proposalId,
          status: str(row.proposal_status),
          score: typeof proposed.score === 'number' ? proposed.score : null,
          rationale: typeof proposed.rationale === 'string' ? proposed.rationale : null,
          perCriterion,
          provider: str(row.provider),
          model: str(row.model),
          promptVersion: str(row.prompt_version),
          inputDigest: nstr(row.proposal_input_digest),
        }
      : null,
  }
}

/** Cobertura pura del gate de confirmación — exportada para tests sin DB. */
export const buildAssessmentAiRunReviewCoverage = (
  items: Pick<AssessmentAiReviewItem, 'status' | 'riskClass' | 'resolution'>[],
  digestStale: boolean,
): AssessmentAiRunReviewCoverage => ({
  scoringPending: items.filter(i => i.status === 'pending' || i.status === 'claimed').length,
  mandatoryPending: items.filter(i => i.status === 'proposed' && i.riskClass === 'mandatory_review').length,
  mandatoryResolved: items.filter(i => i.riskClass === 'mandatory_review' && i.resolution != null).length,
  samplePending: items.filter(i => i.status === 'proposed' && i.riskClass === 'quality_sample').length,
  sampleResolved: items.filter(i => i.riskClass === 'quality_sample' && i.resolution != null).length,
  batchEligible: items.filter(i => i.status === 'proposed' && i.riskClass === 'batch_eligible').length,
  returnedToManual: items.filter(i => ['abstained', 'failed', 'rejected_to_manual'].includes(i.status)).length,
  closedWithoutProposal: items.filter(i => ['stale', 'superseded_by_manual', 'cancelled'].includes(i.status)).length,
  digestStale,
})

/**
 * Reader `listAssessmentAiReviewItems` — items de revisión del run EXACTO con risk class,
 * reason codes estables, evidencia del proposal, provenance y cobertura de gates.
 *
 * - Exact-scope: `runId → assessment → application` con lineage validado (un run cuyo
 *   assessment ya no resuelve al application registrado es un 409 de integridad, nunca
 *   se sirve silencioso).
 * - `coverage.digestStale` recomputa el digest HOY (modelo/prompt/policy efectivos +
 *   answers/rubric actuales) contra el digest inmutable del run.
 */
export const listAssessmentAiReviewItems = async (runId: string): Promise<AssessmentAiRunReview> => {
  const run = await getScoringRunById(runId)

  if (!run) {
    throw new HiringNotFoundError('El run de scoring no existe.', 'assessment_ai_run_not_found')
  }

  // Lineage exacto: el assessment del run debe existir y pertenecer a la application registrada.
  const lineage = await runGreenhousePostgresQuery<{ application_id: unknown }>(
    `SELECT application_id FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1`,
    [run.assessmentId],
  )

  if (!lineage[0] || String(lineage[0].application_id) !== run.applicationId) {
    throw new HiringValidationError(
      'El lineage del run no es consistente con el assessment registrado.',
      'assessment_ai_run_lineage_mismatch',
      409,
    )
  }

  const rows = await runGreenhousePostgresQuery<ReviewItemRow>(
    `SELECT i.run_item_id, i.response_id, i.status, i.risk_class, i.reason_code,
            i.routing_reasons, i.attempt_count, i.resolution, i.saw_proposal_before_scoring,
            i.resolved_by, i.resolved_at,
            q.prompt AS question_prompt, q.type AS question_type, r.answer_json,
            p.proposal_id, p.status AS proposal_status, p.proposed_json, p.provider,
            p.model, p.prompt_version, p.input_digest AS proposal_input_digest
       FROM greenhouse_hiring.hiring_assessment_ai_scoring_run_item i
       JOIN greenhouse_hiring.hiring_assessment_response r ON r.response_id = i.response_id
       JOIN greenhouse_hiring.hiring_question q ON q.question_id = r.question_id
       LEFT JOIN greenhouse_hiring.hiring_assessment_ai_proposal p ON p.proposal_id = i.proposal_id
      WHERE i.run_id = $1
      ORDER BY i.created_at, i.run_item_id`,
    [runId],
  )

  const items = rows.map(normalizeReviewItem)

  const currentDigest = await computeCurrentScoringRunDigest(
    run.assessmentId,
    items.map(i => i.responseId),
  )

  return {
    run,
    items,
    coverage: buildAssessmentAiRunReviewCoverage(items, currentDigest !== run.inputDigest),
  }
}
