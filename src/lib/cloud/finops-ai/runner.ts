import 'server-only'

import { getGoogleGenAIClient, getGreenhouseAgentRuntimeConfig } from '@/lib/ai/google-genai'
import { getGcpBillingOverview } from '@/lib/cloud/gcp-billing'
import type { GcpBillingOverview } from '@/types/billing-export'

import {
  type CloudCostAiConfidence,
  type CloudCostAiObservationInput,
  type CloudCostAiSeverity,
  generateCloudCostAiObservationId,
  generateCloudCostAiSweepRunId,
  getLatestCloudCostAiFingerprint,
  recordCloudCostAiObservation,
  stableFingerprint
} from './persist'

export type CloudCostAiSweepTrigger = 'cron' | 'manual' | 'cloud_scheduler'

export interface CloudCostAiSweepSummary {
  sweepRunId: string
  startedAt: string
  finishedAt: string
  triggeredBy: CloudCostAiSweepTrigger
  durationMs: number
  model: string
  observationsEvaluated: number
  observationsPersisted: number
  observationsSkipped: number
  promptTokens: number | null
  outputTokens: number | null
  skippedReason: string | null
}

export interface CloudCostAiSweepResult {
  summary: CloudCostAiSweepSummary
  observations: CloudCostAiObservationInput[]
}

interface CloudCostAiResponse {
  severity: CloudCostAiSeverity
  executiveSummary: string
  topCostDrivers: unknown[]
  probableCauses: unknown[]
  attackPriority: unknown[]
  recommendedActions: unknown[]
  missingTelemetry: string[]
  confidence: CloudCostAiConfidence
}

interface RunCloudCostAiCopilotArgs {
  triggeredBy?: CloudCostAiSweepTrigger
  env?: NodeJS.ProcessEnv
  preloadedOverview?: GcpBillingOverview
  force?: boolean
}

const VALID_SEVERITIES: ReadonlySet<CloudCostAiSeverity> = new Set([
  'ok',
  'warning',
  'error',
  'skipped'
])

const VALID_CONFIDENCE: ReadonlySet<CloudCostAiConfidence> = new Set([
  'high',
  'medium',
  'low',
  'unknown'
])

const isCloudCostAiEnabled = (env: NodeJS.ProcessEnv) =>
  env.CLOUD_COST_AI_COPILOT_ENABLED === 'true'

const buildSummary = (
  base: {
    sweepRunId: string
    startedAt: Date
    triggeredBy: CloudCostAiSweepTrigger
    model: string
  },
  overrides: Partial<CloudCostAiSweepSummary>
): CloudCostAiSweepSummary => {
  const finishedAt = new Date()

  return {
    sweepRunId: base.sweepRunId,
    startedAt: base.startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    triggeredBy: base.triggeredBy,
    durationMs: Math.max(0, finishedAt.getTime() - base.startedAt.getTime()),
    model: base.model,
    observationsEvaluated: 0,
    observationsPersisted: 0,
    observationsSkipped: 0,
    promptTokens: null,
    outputTokens: null,
    skippedReason: null,
    ...overrides
  }
}

const stripJsonFence = (raw: string): string => {
  const trimmed = raw.trim()

  if (!trimmed.startsWith('```')) return trimmed

  return trimmed.replace(/^```(?:json)?\s*/, '').replace(/```$/, '').trim()
}

const safeParseJson = (raw: string): CloudCostAiResponse | null => {
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as Partial<CloudCostAiResponse>

    if (!parsed || typeof parsed !== 'object') return null
    if (!VALID_SEVERITIES.has(parsed.severity as CloudCostAiSeverity)) return null
    if (!VALID_CONFIDENCE.has(parsed.confidence as CloudCostAiConfidence)) return null
    if (typeof parsed.executiveSummary !== 'string') return null

    return {
      severity: parsed.severity as CloudCostAiSeverity,
      executiveSummary: parsed.executiveSummary,
      topCostDrivers: Array.isArray(parsed.topCostDrivers) ? parsed.topCostDrivers : [],
      probableCauses: Array.isArray(parsed.probableCauses) ? parsed.probableCauses : [],
      attackPriority: Array.isArray(parsed.attackPriority) ? parsed.attackPriority : [],
      recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
      missingTelemetry: Array.isArray(parsed.missingTelemetry)
        ? parsed.missingTelemetry.map(String).slice(0, 20)
        : [],
      confidence: parsed.confidence as CloudCostAiConfidence
    }
  } catch {
    return null
  }
}

const buildPrompts = (overview: GcpBillingOverview) => {
  const compact = {
    generatedAt: overview.generatedAt,
    period: overview.period,
    totalCost: overview.totalCost,
    currency: overview.currency,
    forecast: overview.forecast,
    topDrivers: overview.topDrivers,
    topServices: overview.costByService.slice(0, 10).map(service => ({
      serviceDescription: service.serviceDescription,
      cost: service.cost,
      share: service.share,
      baselineDailyCost: service.baselineDailyCost,
      recentDailyCost: service.recentDailyCost,
      deltaPercent: service.deltaPercent,
      topResources: service.topResources?.slice(0, 3)
    })),
    topResources: overview.costByResource?.slice(0, 10),
    notes: overview.notes
  }

  return {
    systemPrompt: [
      'Eres el Copiloto FinOps de Greenhouse.',
      'Explicas costos GCP solo desde evidencia entregada: Billing Export, forecast y drivers determinísticos.',
      'No inventes métricas, tablas ni recursos. Si falta telemetría, dilo en missingTelemetry.',
      'Responde SOLO JSON válido con camelCase.'
    ].join('\n'),
    userPrompt: JSON.stringify({
      task: 'Interpreta costos cloud y prioriza dónde atacar para reducir gasto sin romper operación.',
      requiredJsonShape: {
        severity: 'ok | warning | error',
        executiveSummary: 'string breve en español',
        topCostDrivers: ['drivers explicados con evidencia'],
        probableCauses: ['causas probables, no inventadas'],
        attackPriority: ['acciones ordenadas por impacto/seguridad'],
        recommendedActions: ['acciones concretas y reversibles'],
        missingTelemetry: ['telemetría faltante para mejorar diagnóstico'],
        confidence: 'high | medium | low | unknown'
      },
      overview: compact
    })
  }
}

const isMissingPersistenceTable = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error)

  return /cloud_cost_ai_observations|cloud_cost_alert_dispatches|relation .* does not exist/i.test(message)
}

export const runCloudCostAiCopilot = async ({
  triggeredBy = 'cron',
  env = process.env,
  preloadedOverview,
  force = false
}: RunCloudCostAiCopilotArgs = {}): Promise<CloudCostAiSweepResult> => {
  const startedAt = new Date()
  const sweepRunId = generateCloudCostAiSweepRunId()
  const disabledModel = env.GREENHOUSE_AGENT_MODEL?.trim() || 'disabled'

  if (!isCloudCostAiEnabled(env)) {
    return {
      summary: buildSummary(
        { sweepRunId, startedAt, triggeredBy, model: disabledModel },
        { skippedReason: 'CLOUD_COST_AI_COPILOT_ENABLED=false (opt-in default OFF)' }
      ),
      observations: []
    }
  }

  const { model } = getGreenhouseAgentRuntimeConfig()

  const overview = preloadedOverview ?? (await getGcpBillingOverview({ days: 30, forceRefresh: true }))

  if (overview.availability !== 'configured') {
    return {
      summary: buildSummary(
        { sweepRunId, startedAt, triggeredBy, model },
        { skippedReason: `Billing Export availability=${overview.availability}` }
      ),
      observations: []
    }
  }

  const fingerprint = stableFingerprint({
    forecast: overview.forecast,
    topDrivers: overview.topDrivers,
    topServices: overview.costByService.slice(0, 10),
    topResources: overview.costByResource?.slice(0, 10)
  })

  try {
    const latestFingerprint = await getLatestCloudCostAiFingerprint()

    if (!force && latestFingerprint === fingerprint) {
      return {
        summary: buildSummary(
          { sweepRunId, startedAt, triggeredBy, model },
          {
            observationsEvaluated: 1,
            observationsSkipped: 1,
            skippedReason: 'Fingerprint sin cambios desde la última observación AI'
          }
        ),
        observations: []
      }
    }
  } catch (error) {
    if (isMissingPersistenceTable(error)) {
      return {
        summary: buildSummary(
          { sweepRunId, startedAt, triggeredBy, model },
          { skippedReason: 'Persistence table greenhouse_ai.cloud_cost_ai_observations no existe aún' }
        ),
        observations: []
      }
    }

    throw error
  }

  const { systemPrompt, userPrompt } = buildPrompts(overview)
  const client = await getGoogleGenAIClient()

  const response = await client.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.1,
      responseMimeType: 'application/json',
      maxOutputTokens: 4096
    }
  })

  const rawText = response.text?.trim()

  if (!rawText) {
    return {
      summary: buildSummary(
        { sweepRunId, startedAt, triggeredBy, model },
        { observationsEvaluated: 1, skippedReason: 'Gemini returned empty response' }
      ),
      observations: []
    }
  }

  const parsed = safeParseJson(rawText)

  if (!parsed) {
    console.error(`[cloud-cost-ai] JSON parse failed: ${rawText.slice(0, 800)}`)

    return {
      summary: buildSummary(
        { sweepRunId, startedAt, triggeredBy, model },
        { observationsEvaluated: 1, skippedReason: 'Gemini response was not valid JSON' }
      ),
      observations: []
    }
  }

  const usage = response.usageMetadata
  const promptTokens = typeof usage?.promptTokenCount === 'number' ? usage.promptTokenCount : null
  const outputTokens = typeof usage?.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : null
  const observedAt = new Date().toISOString()

  const observation: CloudCostAiObservationInput = {
    observationId: generateCloudCostAiObservationId(),
    sweepRunId,
    fingerprint,
    severity: parsed.severity,
    executiveSummary: parsed.executiveSummary,
    topCostDrivers: parsed.topCostDrivers,
    probableCauses: parsed.probableCauses,
    attackPriority: parsed.attackPriority,
    recommendedActions: parsed.recommendedActions,
    missingTelemetry: parsed.missingTelemetry,
    confidence: parsed.confidence,
    model,
    promptTokens,
    outputTokens,
    observedAt
  }

  await recordCloudCostAiObservation(observation)

  return {
    summary: buildSummary(
      { sweepRunId, startedAt, triggeredBy, model },
      {
        observationsEvaluated: 1,
        observationsPersisted: 1,
        promptTokens,
        outputTokens
      }
    ),
    observations: [observation]
  }
}
