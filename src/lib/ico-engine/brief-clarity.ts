import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { getSpaceNotionGovernance } from '@/lib/space-notion/notion-governance'

export const BRIEF_CLARITY_SCORE_METRIC_ID = 'brief_clarity_score'
export const BRIEF_CLARITY_PASSING_SCORE = 80

export type BriefClarityDataStatus = 'available' | 'degraded' | 'unavailable'
export type BriefClarityConfidenceLevel = 'high' | 'medium' | 'low'
export type BriefClarityEvidenceMode = 'observed' | 'missing'
export type BriefClarityScoringMethod = 'automatic' | 'human' | 'hybrid' | 'unknown'
export type BriefIntakePolicyStatus = 'ready' | 'degraded' | 'blocked' | 'unknown'

export interface BriefClarityScoreEvidence {
  taskId: string | null
  score: number | null
  passed: boolean | null
  breakdown: string | null
  reasoning: string | null
  model: string | null
  promptVersion: string | null
  promptHash: string | null
  confidence: number | null
  inputSnapshotUrl: string | null
  processedAt: string | null
}

export interface BriefClarityGovernanceEvidence {
  readinessStatus: string | null
  blockingIssuesCount: number
  warningsCount: number
  persistedMappings: number
  mappedCoreFields: number
  missingCoreFields: number
  contractVersion: string | null
}

export interface BriefClarityMetric {
  value: number | null
  threshold: number
  passed: boolean | null
  dataStatus: BriefClarityDataStatus
  confidenceLevel: BriefClarityConfidenceLevel | null
  evidenceMode: BriefClarityEvidenceMode
  scoringMethod: BriefClarityScoringMethod
  intakePolicyStatus: BriefIntakePolicyStatus
  effectiveBriefAt: string | null
  qualityGateReasons: string[]
  evidence: {
    score: BriefClarityScoreEvidence | null
    governance: BriefClarityGovernanceEvidence | null
  }
}

type BriefClarityScoreRow = {
  task_id: unknown
  score: unknown
  passed: unknown
  breakdown: unknown
  reasoning: unknown
  model: unknown
  prompt_version: unknown
  prompt_hash: unknown
  confidence: unknown
  input_snapshot_url: unknown
  processed_at: unknown
}

type BriefClarityInput = {
  score: BriefClarityScoreEvidence | null
  governance: BriefClarityGovernanceEvidence | null
  threshold?: number
  qualityGateReasons?: string[]
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value === 'string') return value

  if (value && typeof value === 'object' && 'value' in value) {
    const nested = (value as { value: unknown }).value

    return typeof nested === 'string' ? nested : null
  }

  return null
}

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toNumberOrNull((value as { value: unknown }).value)
  }

  return null
}

const toBoolOrNull = (value: unknown): boolean | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toBoolOrNull((value as { value: unknown }).value)
  }

  return null
}

const toDateOnly = (value: string | null | undefined): string | null => {
  if (!value) return null

  const normalized = value.trim().slice(0, 10)

  return DATE_ONLY_RE.test(normalized) ? normalized : null
}

const mapGovernanceStatus = (value: string | null | undefined): BriefIntakePolicyStatus => {
  if (value === 'ready') return 'ready'
  if (value === 'warning') return 'degraded'
  if (value === 'blocked') return 'blocked'

  return 'unknown'
}

const inferScoringMethod = (score: BriefClarityScoreEvidence | null): BriefClarityScoringMethod => {
  if (!score) return 'unknown'

  const hasAutomaticSignals = Boolean(score.model || score.promptVersion || score.promptHash)
  const hasHumanSignals = Boolean(score.reasoning && !hasAutomaticSignals)

  if (hasAutomaticSignals && hasHumanSignals) return 'hybrid'
  if (hasAutomaticSignals) return 'automatic'
  if (hasHumanSignals) return 'human'

  return 'unknown'
}

const deriveConfidenceLevel = ({
  score,
  policyStatus,
  passed,
  value
}: {
  score: BriefClarityScoreEvidence | null
  policyStatus: BriefIntakePolicyStatus
  passed: boolean | null
  value: number | null
}): BriefClarityConfidenceLevel | null => {
  if (value === null) return null

  const scoreConfidence = score?.confidence ?? null

  if (policyStatus === 'ready' && passed && scoreConfidence !== null && scoreConfidence >= 0.85) return 'high'
  if (policyStatus !== 'blocked' && (scoreConfidence === null || scoreConfidence >= 0.6)) return 'medium'

  return 'low'
}

export const resolveBriefClarityMetric = ({
  score,
  governance,
  threshold = BRIEF_CLARITY_PASSING_SCORE,
  qualityGateReasons = []
}: BriefClarityInput): BriefClarityMetric => {
  const reasons = [...qualityGateReasons]
  const value = score?.score ?? null
  const policyStatus = mapGovernanceStatus(governance?.readinessStatus)
  const inferredPassed = value !== null ? value >= threshold : null
  const passed = score?.passed ?? inferredPassed

  if (!governance) {
    reasons.push('Sin governance de Notion por space; no se puede validar cobertura del brief.')
  } else {
    if (policyStatus === 'blocked') {
      reasons.push('El intake está bloqueado por governance de Notion.')
    } else if (policyStatus === 'degraded') {
      reasons.push('El intake tiene warnings activos en governance de Notion.')
    }

    if (governance.missingCoreFields > 0) {
      reasons.push(`Faltan ${governance.missingCoreFields} campos core del brief en el contrato de governance.`)
    }
  }

  if (!score) {
    reasons.push('No existe un score auditado de Brief Clarity Score para este proyecto.')

    return {
      value: null,
      threshold,
      passed: null,
      dataStatus: 'unavailable',
      confidenceLevel: null,
      evidenceMode: 'missing',
      scoringMethod: 'unknown',
      intakePolicyStatus: policyStatus,
      effectiveBriefAt: null,
      qualityGateReasons: reasons,
      evidence: {
        score: null,
        governance
      }
    }
  }

  if (value === null) {
    reasons.push('La evaluación auditada de Brief Clarity no trae score numérico.')
  } else if (!passed) {
    reasons.push(`El brief quedó bajo el umbral mínimo de ${threshold} puntos.`)
  }

  const effectiveBriefAt = passed ? toDateOnly(score.processedAt) : null

  if (passed && !effectiveBriefAt) {
    reasons.push('El brief pasó el umbral, pero no trae fecha procesada válida para fijar brief efectivo.')
  }

  const dataStatus =
    value === null
      ? 'unavailable'
      : policyStatus === 'ready' && passed && Boolean(effectiveBriefAt)
        ? 'available'
        : 'degraded'

  return {
    value,
    threshold,
    passed,
    dataStatus,
    confidenceLevel: deriveConfidenceLevel({
      score,
      policyStatus,
      passed,
      value
    }),
    evidenceMode: 'observed',
    scoringMethod: inferScoringMethod(score),
    intakePolicyStatus: policyStatus,
    effectiveBriefAt,
    qualityGateReasons: reasons,
    evidence: {
      score,
      governance
    }
  }
}

const mapScoreRow = (row: BriefClarityScoreRow | null): BriefClarityScoreEvidence | null => {
  if (!row) return null

  return {
    taskId: toStringOrNull(row.task_id),
    score: toNumberOrNull(row.score),
    passed: toBoolOrNull(row.passed),
    breakdown: toStringOrNull(row.breakdown),
    reasoning: toStringOrNull(row.reasoning),
    model: toStringOrNull(row.model),
    promptVersion: toStringOrNull(row.prompt_version),
    promptHash: toStringOrNull(row.prompt_hash),
    confidence: toNumberOrNull(row.confidence),
    inputSnapshotUrl: toStringOrNull(row.input_snapshot_url),
    processedAt: toStringOrNull(row.processed_at)
  }
}

const mapGovernanceEvidence = async (spaceId: string): Promise<BriefClarityGovernanceEvidence | null> => {
  const governance = await getSpaceNotionGovernance(spaceId)
  const readiness = governance.readiness

  if (!readiness) return null

  return {
    readinessStatus: readiness.readinessStatus,
    blockingIssuesCount: readiness.blockingIssues.length,
    warningsCount: readiness.warnings.length,
    persistedMappings: readiness.mappingSummary.persistedMappings,
    mappedCoreFields: readiness.mappingSummary.mappedCoreFields,
    missingCoreFields: readiness.mappingSummary.missingCoreFields,
    contractVersion: readiness.contractVersion
  }
}

export const getProjectBriefClarityMetric = async ({
  projectSourceId,
  spaceId,
  threshold = BRIEF_CLARITY_PASSING_SCORE
}: {
  projectSourceId: string
  spaceId: string | null | undefined
  threshold?: number
}): Promise<BriefClarityMetric> => {
  if (!spaceId) {
    return resolveBriefClarityMetric({
      score: null,
      governance: null,
      threshold,
      qualityGateReasons: ['Sin `space_id` en el contexto tenant; no se puede resolver BCS por proyecto.']
    })
  }

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [scoreResult, governance] = await Promise.all([
    bigQuery.query({
      query: `
        WITH project_tasks AS (
          SELECT DISTINCT task_source_id
          FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
          WHERE space_id = @spaceId
            AND project_source_id = @projectSourceId
            AND COALESCE(is_deleted, FALSE) = FALSE
        )
        SELECT
          ai.task_id,
          ai.score,
          ai.passed,
          ai.breakdown,
          ai.reasoning,
          ai.model,
          ai.prompt_version,
          ai.prompt_hash,
          ai.confidence,
          ai.input_snapshot_url,
          ai.processed_at
        FROM \`${projectId}.ico_engine.ai_metric_scores\` ai
        INNER JOIN project_tasks tasks
          ON tasks.task_source_id = ai.task_id
        WHERE ai.space_id = @spaceId
          AND ai.metric_id = @metricId
        QUALIFY ROW_NUMBER() OVER (
          ORDER BY ai.processed_at DESC NULLS LAST, ai._synced_at DESC NULLS LAST, ai.task_id
        ) = 1
      `,
      params: {
        spaceId,
        projectSourceId,
        metricId: BRIEF_CLARITY_SCORE_METRIC_ID
      }
    }),
    mapGovernanceEvidence(spaceId)
  ])

  return resolveBriefClarityMetric({
    score: mapScoreRow(((scoreResult[0] as BriefClarityScoreRow[])?.[0] ?? null)),
    governance,
    threshold
  })
}

export const getFirstEffectiveBriefDateForProjects = async ({
  projectSourceIds,
  spaceId,
  threshold = BRIEF_CLARITY_PASSING_SCORE
}: {
  projectSourceIds: string[]
  spaceId: string | null | undefined
  threshold?: number
}): Promise<string | null> => {
  if (!spaceId || projectSourceIds.length === 0) return null

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `
      WITH project_tasks AS (
        SELECT DISTINCT task_source_id
        FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
        WHERE space_id = @spaceId
          AND project_source_id IN UNNEST(@projectSourceIds)
          AND COALESCE(is_deleted, FALSE) = FALSE
      )
      SELECT
        MIN(DATE(ai.processed_at)) AS first_effective_brief_date
      FROM \`${projectId}.ico_engine.ai_metric_scores\` ai
      INNER JOIN project_tasks tasks
        ON tasks.task_source_id = ai.task_id
      WHERE ai.space_id = @spaceId
        AND ai.metric_id = @metricId
        AND (
          ai.passed = TRUE
          OR (ai.passed IS NULL AND ai.score >= @threshold)
        )
    `,
    params: {
      spaceId,
      projectSourceIds,
      metricId: BRIEF_CLARITY_SCORE_METRIC_ID,
      threshold
    }
  })

  const value = toStringOrNull(((rows as Array<{ first_effective_brief_date?: unknown }>)?.[0] ?? {}).first_effective_brief_date)

  return toDateOnly(value)
}
