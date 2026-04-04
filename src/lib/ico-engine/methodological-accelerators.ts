import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import type { IterationVelocityMetric } from '@/lib/ico-engine/iteration-velocity'
import type { MetricsSummary } from '@/lib/ico-engine/read-metrics'
import type { RevenueEnabledMeasurementModel } from '@/lib/ico-engine/revenue-enabled'

export const BRAND_CONSISTENCY_SCORE_METRIC_ID = 'brand_consistency_score'

export type MethodologicalAcceleratorPolicyVersion = 'ma_v1'
export type MethodologicalAcceleratorDataStatus = 'available' | 'degraded' | 'unavailable'
export type MethodologicalAcceleratorEvidenceMode = 'observed' | 'proxy' | 'missing'
export type MethodologicalAcceleratorConfidenceLevel = 'high' | 'medium' | 'low'
export type MethodologicalAcceleratorOutcomeLinkStatus = 'connected' | 'partial' | 'missing'

export interface MethodologicalAcceleratorOutcomeLink {
  id: string
  label: string
  status: MethodologicalAcceleratorOutcomeLinkStatus
  detail: string
}

export interface BrandVoiceAiEvidence {
  averageScore: number | null
  scoredTasks: number
  passingTasks: number
  lastProcessedAt: string | null
  promptVersion: string | null
  promptHash: string | null
  confidence: number | null
}

export interface MethodologicalAcceleratorSignal {
  id: 'design_system' | 'brand_voice_ai'
  label: string
  dataStatus: MethodologicalAcceleratorDataStatus
  evidenceMode: MethodologicalAcceleratorEvidenceMode
  confidenceLevel: MethodologicalAcceleratorConfidenceLevel | null
  summaryValue: string | null
  summary: string
  qualityGateReasons: string[]
  outcomeLinks: MethodologicalAcceleratorOutcomeLink[]
  evidence: {
    brandVoiceAi: BrandVoiceAiEvidence | null
  }
}

export interface MethodologicalAcceleratorsContract {
  policyVersion: MethodologicalAcceleratorPolicyVersion
  designSystem: MethodologicalAcceleratorSignal
  brandVoiceAi: MethodologicalAcceleratorSignal
}

type BrandVoiceAiEvidenceRow = {
  average_score: unknown
  scored_tasks: unknown
  passing_tasks: unknown
  last_processed_at: unknown
  prompt_version: unknown
  prompt_hash: unknown
  confidence: unknown
}

interface MethodologicalAcceleratorsInput {
  metricsSummary?: MetricsSummary | null
  iterationVelocity: IterationVelocityMetric
  revenueEnabled: RevenueEnabledMeasurementModel
  brandVoiceAiEvidence?: BrandVoiceAiEvidence | null
}

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return toNumberOrNull((value as { value?: unknown }).value)
  }

  return null
}

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value === 'string') return value

  if (value && typeof value === 'object' && 'value' in value) {
    const nested = (value as { value?: unknown }).value

    return typeof nested === 'string' ? nested : null
  }

  return null
}

const buildOutcomeLink = (
  id: string,
  label: string,
  status: MethodologicalAcceleratorOutcomeLinkStatus,
  detail: string
): MethodologicalAcceleratorOutcomeLink => ({
  id,
  label,
  status,
  detail
})

const formatPercent = (value: number | null) => (value !== null ? `${Math.round(value)}%` : null)
const formatRatio = (value: number | null) => (value !== null ? `${Math.round(value * 10) / 10}x` : null)
const formatDays = (value: number | null) => (value !== null ? `${Math.round(value * 10) / 10}d` : null)

const deriveProxyConfidence = (connectedLinks: number): MethodologicalAcceleratorConfidenceLevel | null => {
  if (connectedLinks >= 5) return 'high'
  if (connectedLinks >= 3) return 'medium'
  if (connectedLinks >= 1) return 'low'

  return null
}

const deriveObservedConfidence = (value: number | null): MethodologicalAcceleratorConfidenceLevel | null => {
  if (value === null) return null
  if (value >= 0.85) return 'high'
  if (value >= 0.6) return 'medium'

  return 'low'
}

const buildDesignSystemSignal = ({
  metricsSummary,
  iterationVelocity
}: Pick<MethodologicalAcceleratorsInput, 'metricsSummary' | 'iterationVelocity'>): MethodologicalAcceleratorSignal => {
  const outcomeLinks: MethodologicalAcceleratorOutcomeLink[] = [
    buildOutcomeLink(
      'ftr',
      'FTR',
      metricsSummary?.ftrPct !== null && metricsSummary?.ftrPct !== undefined ? 'connected' : 'missing',
      metricsSummary?.ftrPct !== null && metricsSummary?.ftrPct !== undefined
        ? `FTR materializado disponible (${formatPercent(metricsSummary.ftrPct)}).`
        : 'Todavía no hay FTR materializado suficiente en el scope visible.'
    ),
    buildOutcomeLink(
      'rpa',
      'RpA',
      metricsSummary?.rpaAvg !== null && metricsSummary?.rpaAvg !== undefined ? 'connected' : 'missing',
      metricsSummary?.rpaAvg !== null && metricsSummary?.rpaAvg !== undefined
        ? `RpA materializado disponible (${formatRatio(metricsSummary.rpaAvg)}).`
        : 'Todavía no hay RpA materializado suficiente en el scope visible.'
    ),
    buildOutcomeLink(
      'cycle-time',
      'Cycle Time',
      metricsSummary?.cycleTimeDays !== null && metricsSummary?.cycleTimeDays !== undefined ? 'connected' : 'missing',
      metricsSummary?.cycleTimeDays !== null && metricsSummary?.cycleTimeDays !== undefined
        ? `Cycle Time materializado disponible (${formatDays(metricsSummary.cycleTimeDays)}).`
        : 'Todavía no hay Cycle Time materializado suficiente en el scope visible.'
    ),
    buildOutcomeLink(
      'throughput',
      'Throughput',
      metricsSummary?.throughput !== null && metricsSummary?.throughput !== undefined ? 'connected' : 'missing',
      metricsSummary?.throughput !== null && metricsSummary?.throughput !== undefined
        ? `Throughput materializado disponible (${Math.round(metricsSummary.throughput)} tasks).`
        : 'Todavía no hay throughput materializado suficiente en el scope visible.'
    ),
    buildOutcomeLink(
      'iteration-velocity',
      'Iteration Velocity',
      iterationVelocity.value !== null ? 'connected' : 'missing',
      iterationVelocity.value !== null
        ? `Iteration Velocity disponible como ${iterationVelocity.evidenceMode === 'observed' ? 'dato observado' : 'proxy operativo'} (${iterationVelocity.value}/${iterationVelocity.cadenceWindowDays}d).`
        : 'Todavía no hay lectura suficiente de Iteration Velocity en el scope visible.'
    )
  ]

  const connectedLinks = outcomeLinks.filter(link => link.status === 'connected').length
  const qualityGateReasons = ['Todavía no existe un AI writer específico para `Design System`; la lectura inicial se apoya en outcomes canónicos del engine.']

  if (connectedLinks < 5) {
    qualityGateReasons.push('La señal sigue parcial: no todos los outcomes metodológicos están disponibles a la vez en esta cuenta.')
  }

  if (connectedLinks === 0) {
    qualityGateReasons.push('Sin outcomes canónicos suficientes para instrumentar efecto metodológico en esta scope.')
  }

  return {
    id: 'design_system',
    label: 'Design System',
    dataStatus: connectedLinks >= 4 ? 'available' : connectedLinks >= 2 ? 'degraded' : 'unavailable',
    evidenceMode: connectedLinks > 0 ? 'proxy' : 'missing',
    confidenceLevel: deriveProxyConfidence(connectedLinks),
    summaryValue: connectedLinks > 0 ? `${connectedLinks}/5 outcomes` : null,
    summary:
      connectedLinks > 0
        ? 'La lectura inicial conecta el acelerador con FTR, RpA, Cycle Time, Throughput e Iteration Velocity sin exponer componentes, tokens ni IP interna.'
        : 'La cuenta todavía no tiene outcomes suficientes para sostener una lectura metodológica defendible de Design System.',
    qualityGateReasons,
    outcomeLinks,
    evidence: {
      brandVoiceAi: null
    }
  }
}

const buildBrandVoiceAiSignal = ({
  metricsSummary,
  iterationVelocity,
  revenueEnabled,
  brandVoiceAiEvidence
}: MethodologicalAcceleratorsInput): MethodologicalAcceleratorSignal => {
  const hasBrandConsistency = brandVoiceAiEvidence?.averageScore !== null && brandVoiceAiEvidence?.averageScore !== undefined

  const outcomeLinks: MethodologicalAcceleratorOutcomeLink[] = [
    buildOutcomeLink(
      'brand-consistency',
      'Brand Consistency',
      hasBrandConsistency ? 'connected' : 'missing',
      hasBrandConsistency
        ? `Score auditado disponible (${formatPercent(brandVoiceAiEvidence?.averageScore ?? null)}) sobre ${brandVoiceAiEvidence?.scoredTasks ?? 0} assets evaluados.`
        : 'Todavía no existe `brand_consistency_score` auditado en el scope visible.'
    ),
    buildOutcomeLink(
      'brief-clarity',
      'BCS',
      'partial',
      'La relación con calidad upstream se conserva por contrato, pero en esta scope aún no existe reader portfolio agregado de BCS.'
    ),
    buildOutcomeLink(
      'ftr',
      'FTR',
      metricsSummary?.ftrPct !== null && metricsSummary?.ftrPct !== undefined ? 'connected' : 'missing',
      metricsSummary?.ftrPct !== null && metricsSummary?.ftrPct !== undefined
        ? `FTR materializado disponible (${formatPercent(metricsSummary.ftrPct)}).`
        : 'Todavía no hay FTR materializado suficiente para esta lectura.'
    ),
    buildOutcomeLink(
      'iteration-velocity',
      'Iteration Velocity',
      iterationVelocity.value !== null ? 'connected' : 'missing',
      iterationVelocity.value !== null
        ? `Iteration Velocity disponible como ${iterationVelocity.evidenceMode === 'observed' ? 'dato observado' : 'proxy operativo'} (${iterationVelocity.value}/${iterationVelocity.cadenceWindowDays}d).`
        : 'Todavía no hay lectura suficiente de Iteration Velocity en esta scope.'
    ),
    buildOutcomeLink(
      'revenue-enabled',
      'Revenue Enabled',
      revenueEnabled.attributionClass !== 'unavailable' ? 'partial' : 'missing',
      revenueEnabled.attributionClass !== 'unavailable'
        ? `La conexión a revenue sigue siendo editorial y respeta la policy ${revenueEnabled.attributionClass}; Brand Voice no salta directo a revenue observado.`
        : 'Sin puente defendible a Revenue Enabled en esta scope.'
    )
  ]

  const qualityGateReasons: string[] = []

  if (!hasBrandConsistency) {
    qualityGateReasons.push('No existe `brand_consistency_score` auditado para el scope visible; la lectura de Brand Voice para AI sigue sin evidencia observada.')
  }

  qualityGateReasons.push('La lectura de Brand Voice para AI no debe exponer prompts, frameworks ni artefactos internos del cliente o de Globe.')

  if (iterationVelocity.value === null) {
    qualityGateReasons.push('Sin Iteration Velocity suficiente, la conexión downstream queda incompleta.')
  }

  return {
    id: 'brand_voice_ai',
    label: 'Brand Voice para AI',
    dataStatus: hasBrandConsistency ? 'available' : 'unavailable',
    evidenceMode: hasBrandConsistency ? 'observed' : 'missing',
    confidenceLevel: deriveObservedConfidence(brandVoiceAiEvidence?.confidence ?? null),
    summaryValue: hasBrandConsistency ? formatPercent(brandVoiceAiEvidence?.averageScore ?? null) : null,
    summary: hasBrandConsistency
      ? 'La señal se sostiene con score auditado de Brand Consistency y se conecta con calidad downstream sin presentar causalidad monetaria directa.'
      : 'La cuenta todavía no tiene score auditado suficiente para servir Brand Voice para AI como señal metodológica observada.',
    qualityGateReasons,
    outcomeLinks,
    evidence: {
      brandVoiceAi: brandVoiceAiEvidence ?? null
    }
  }
}

export const buildMethodologicalAcceleratorsContract = (
  input: MethodologicalAcceleratorsInput
): MethodologicalAcceleratorsContract => ({
  policyVersion: 'ma_v1',
  designSystem: buildDesignSystemSignal(input),
  brandVoiceAi: buildBrandVoiceAiSignal(input)
})

export const readPortfolioBrandVoiceAiEvidence = async ({
  spaceIds,
  projectSourceIds
}: {
  spaceIds: string[]
  projectSourceIds: string[]
}): Promise<BrandVoiceAiEvidence | null> => {
  const normalizedSpaceIds = [...new Set(spaceIds.filter(Boolean))]
  const normalizedProjectIds = [...new Set(projectSourceIds.filter(Boolean))]

  if (normalizedSpaceIds.length === 0 || normalizedProjectIds.length === 0) {
    return null
  }

  const projectId = getBigQueryProjectId()

  const [rows] = await getBigQueryClient().query({
    query: `
      WITH latest_task_scores AS (
        SELECT
          ai.task_id,
          ai.score,
          ai.passed,
          ai.prompt_version,
          ai.prompt_hash,
          ai.confidence,
          ai.processed_at,
          ROW_NUMBER() OVER (
            PARTITION BY ai.task_id
            ORDER BY ai.processed_at DESC NULLS LAST, ai._synced_at DESC NULLS LAST, ai.task_id
          ) AS task_rank
        FROM \`${projectId}.ico_engine.ai_metric_scores\` ai
        WHERE ai.metric_id = @metricId
          AND ai.space_id IN UNNEST(@spaceIds)
          AND ai.project_id IN UNNEST(@projectIds)
      ),
      latest_only AS (
        SELECT *
        FROM latest_task_scores
        WHERE task_rank = 1
      ),
      last_metadata AS (
        SELECT
          prompt_version,
          prompt_hash,
          confidence
        FROM latest_only
        ORDER BY processed_at DESC NULLS LAST, task_id
        LIMIT 1
      )
      SELECT
        AVG(score) AS average_score,
        COUNT(*) AS scored_tasks,
        COUNTIF(passed = TRUE) AS passing_tasks,
        MAX(processed_at) AS last_processed_at,
        (SELECT prompt_version FROM last_metadata) AS prompt_version,
        (SELECT prompt_hash FROM last_metadata) AS prompt_hash,
        (SELECT confidence FROM last_metadata) AS confidence
      FROM latest_only
    `,
    params: {
      metricId: BRAND_CONSISTENCY_SCORE_METRIC_ID,
      spaceIds: normalizedSpaceIds,
      projectIds: normalizedProjectIds
    }
  })

  const row = ((rows as BrandVoiceAiEvidenceRow[])?.[0] ?? null)

  if (!row) {
    return null
  }

  const scoredTasks = Math.max(0, Math.round(toNumberOrNull(row.scored_tasks) ?? 0))
  const averageScore = toNumberOrNull(row.average_score)

  if (scoredTasks === 0 && averageScore === null) {
    return null
  }

  return {
    averageScore,
    scoredTasks,
    passingTasks: Math.max(0, Math.round(toNumberOrNull(row.passing_tasks) ?? 0)),
    lastProcessedAt: toStringOrNull(row.last_processed_at),
    promptVersion: toStringOrNull(row.prompt_version),
    promptHash: toStringOrNull(row.prompt_hash),
    confidence: toNumberOrNull(row.confidence)
  }
}
