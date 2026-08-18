import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type {
  AiScoringRiskClass,
  AiScoringRunItemStatus,
  ProvisionalAssessmentAiCompetency,
  ProvisionalAssessmentAiProjection,
} from '@/types/hiring-assessment-ai-run'

import { HiringNotFoundError, HiringValidationError } from '../../../errors'
import { getEffectiveHiringAssessmentAiRunMode } from './config'
import { listScoringRunsForAssessment } from './store'

interface ProjectionRow extends Record<string, unknown> {
  application_id: unknown
  response_id: unknown
  competency_id: unknown
  competency_key: unknown
  competency_name: unknown
  target_level: unknown
  competency_weight: unknown
  auto_score: unknown
  human_score: unknown
  run_item_id: unknown
  item_status: unknown
  risk_class: unknown
  reason_code: unknown
  routing_reasons: unknown
  resolution: unknown
  proposed_json: unknown
}

const numberOrNull = (value: unknown): number | null => {
  if (value == null || value === '') return null
  const parsed = Number(value)

  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : null
}

const objectValue = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)

      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {}
    } catch {
      return {}
    }
  }

  return {}
}

const stringArray = (value: unknown): string[] => {
  const parsed = typeof value === 'string' ? (() => { try { return JSON.parse(value) } catch { return [] } })() : value

  return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : []
}

const modeFromPolicyVersion = (policyVersion: string | null): string => {
  if (!policyVersion) return getEffectiveHiringAssessmentAiRunMode()

  return policyVersion.split(':')[1] || 'legacy_review'
}

/**
 * Proyección operator-only: combina score efectivo ya existente con proposals del run exacto
 * para responder “qué lectura provisional completa tiene la IA” sin escribir una sola autoridad.
 */
export const readProvisionalAssessmentAiProjection = async (
  assessmentId: string,
): Promise<ProvisionalAssessmentAiProjection> => {
  const runs = await listScoringRunsForAssessment(assessmentId)
  const run = runs.find(candidate => candidate.status !== 'cancelled') ?? runs[0] ?? null

  const rows = await runGreenhousePostgresQuery<ProjectionRow>(
    `SELECT a.application_id, r.response_id, r.competency_id,
            c.key AS competency_key, c.name AS competency_name,
            tm.target_level, COALESCE(tm.weight, 0) AS competency_weight,
            r.auto_score, r.human_score,
            i.run_item_id, i.status AS item_status, i.risk_class, i.reason_code,
            i.routing_reasons, i.resolution, p.proposed_json
       FROM greenhouse_hiring.hiring_assessment a
       JOIN greenhouse_hiring.hiring_assessment_response r ON r.assessment_id = a.assessment_id
       JOIN greenhouse_hiring.hiring_competency c ON c.competency_id = r.competency_id
       LEFT JOIN greenhouse_hiring.hiring_assessment_template_module tm
         ON tm.template_id = a.template_id AND tm.competency_id = r.competency_id
       LEFT JOIN greenhouse_hiring.hiring_assessment_ai_scoring_run_item i
         ON i.run_id = $2 AND i.response_id = r.response_id
       LEFT JOIN greenhouse_hiring.hiring_assessment_ai_proposal p ON p.proposal_id = i.proposal_id
      WHERE a.assessment_id = $1
      ORDER BY c.key, r.response_id`,
    [assessmentId, run?.runId ?? null],
  )

  if (rows.length === 0) {
    const exists = await runGreenhousePostgresQuery<{ application_id: unknown }>(
      `SELECT application_id FROM greenhouse_hiring.hiring_assessment WHERE assessment_id = $1`,
      [assessmentId],
    )

    if (!exists[0]) throw new HiringNotFoundError('El assessment no existe.', 'assessment_not_found')

    return {
      assessmentId,
      applicationId: String(exists[0].application_id),
      runId: run?.runId ?? null,
      runStatus: run?.status ?? null,
      mode: modeFromPolicyVersion(run?.policyVersion ?? null),
      status: run ? 'complete' : 'not_started',
      overallScore: null,
      incorporatedIntoEffectiveScore: false,
      coverage: {
        totalResponses: 0,
        evaluatedResponses: 0,
        effectiveResponses: 0,
        provisionalResponses: 0,
        pendingResponses: 0,
        abstainedResponses: 0,
        failedResponses: 0,
      },
      competencies: [],
      exceptions: [],
      provenance: {
        model: run?.model ?? null,
        promptVersion: run?.promptVersion ?? null,
        policyVersion: run?.policyVersion ?? null,
        inputDigest: run?.inputDigest ?? null,
      },
    }
  }

  const applicationId = String(rows[0].application_id)

  if (run && run.applicationId !== applicationId) {
    throw new HiringValidationError(
      'El lineage del run no coincide con la aplicación del assessment.',
      'assessment_ai_run_lineage_mismatch',
      409,
    )
  }

  const normalized = rows.map(row => {
    const effectiveScore = numberOrNull(row.human_score) ?? numberOrNull(row.auto_score)
    const proposedScore = numberOrNull(objectValue(row.proposed_json).score)

    return {
      row,
      effectiveScore,
      proposedScore,
      score: effectiveScore ?? proposedScore,
    }
  })

  const competencyMap = new Map<string, ProvisionalAssessmentAiCompetency & { scoreSum: number }>()

  for (const entry of normalized) {
    const key = String(entry.row.competency_id)

    const current = competencyMap.get(key) ?? {
      competencyId: key,
      competencyKey: String(entry.row.competency_key),
      competencyName: String(entry.row.competency_name),
      targetLevel: entry.row.target_level == null ? null : String(entry.row.target_level),
      weight: numberOrNull(entry.row.competency_weight) ?? 0,
      score: null,
      scoreSum: 0,
      totalResponses: 0,
      evaluatedResponses: 0,
      provisionalResponses: 0,
    }

    current.totalResponses += 1

    if (entry.score != null) {
      current.evaluatedResponses += 1
      current.scoreSum += entry.score
    }

    if (entry.effectiveScore == null && entry.proposedScore != null) current.provisionalResponses += 1
    competencyMap.set(key, current)
  }

  const competencies = [...competencyMap.values()].map(({ scoreSum, ...competency }) => ({
    ...competency,
    score: competency.evaluatedResponses === competency.totalResponses
      ? Math.round((scoreSum / competency.totalResponses) * 100) / 100
      : null,
  }))

  const completeCompetencies = competencies.filter(competency => competency.score != null)
  const totalWeight = completeCompetencies.reduce((sum, competency) => sum + competency.weight, 0)
  const complete = normalized.every(entry => entry.score != null)

  const overallScore = complete && competencies.length > 0
    ? Math.round((totalWeight > 0
      ? completeCompetencies.reduce((sum, competency) => sum + (competency.score ?? 0) * competency.weight, 0) / totalWeight
      : completeCompetencies.reduce((sum, competency) => sum + (competency.score ?? 0), 0) / completeCompetencies.length) * 100) / 100
    : null

  const abstainedResponses = normalized.filter(entry => entry.row.item_status === 'abstained').length
  const failedResponses = normalized.filter(entry => entry.row.item_status === 'failed').length
  const evaluatedResponses = normalized.filter(entry => entry.score != null).length
  const effectiveResponses = normalized.filter(entry => entry.effectiveScore != null).length
  const provisionalResponses = normalized.filter(entry => entry.effectiveScore == null && entry.proposedScore != null).length
  const running = run && ['created', 'enumerating', 'scoring'].includes(run.status)
  const stale = run && run.policyVersion !== null && modeFromPolicyVersion(run.policyVersion) !== getEffectiveHiringAssessmentAiRunMode()

  return {
    assessmentId,
    applicationId,
    runId: run?.runId ?? null,
    runStatus: run?.status ?? null,
    mode: modeFromPolicyVersion(run?.policyVersion ?? null),
    status: !run
      ? 'not_started'
      : stale
        ? 'stale'
        : running
          ? 'running'
          : failedResponses > 0 && evaluatedResponses === 0
            ? 'failed'
            : complete
              ? 'complete'
              : 'partial',
    overallScore,
    incorporatedIntoEffectiveScore: false,
    coverage: {
      totalResponses: normalized.length,
      evaluatedResponses,
      effectiveResponses,
      provisionalResponses,
      pendingResponses: Math.max(0, normalized.length - evaluatedResponses - abstainedResponses - failedResponses),
      abstainedResponses,
      failedResponses,
    },
    competencies,
    exceptions: normalized.flatMap(entry => {
      const itemStatus = entry.row.item_status as AiScoringRunItemStatus | null
      const routingReasons = stringArray(entry.row.routing_reasons)
      const resolved = entry.row.resolution != null

      if (
        !entry.row.run_item_id
        || resolved
        || (!['abstained', 'failed'].includes(itemStatus ?? '') && routingReasons.length === 0)
      ) return []

      return [{
        runItemId: String(entry.row.run_item_id),
        responseId: String(entry.row.response_id),
        status: itemStatus as AiScoringRunItemStatus,
        riskClass: entry.row.risk_class == null ? null : String(entry.row.risk_class) as AiScoringRiskClass,
        reasonCode: entry.row.reason_code == null ? null : String(entry.row.reason_code),
        routingReasons,
      }]
    }),
    provenance: {
      model: run?.model ?? null,
      promptVersion: run?.promptVersion ?? null,
      policyVersion: run?.policyVersion ?? null,
      inputDigest: run?.inputDigest ?? null,
    },
  }
}
