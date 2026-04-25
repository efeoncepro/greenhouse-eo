import 'server-only'

import { getGoogleGenAIClient, getGreenhouseAgentRuntimeConfig } from '@/lib/ai/google-genai'
import { getReliabilityOverview } from '@/lib/reliability/get-reliability-overview'
import type { ReliabilityModuleKey, ReliabilityOverview, ReliabilitySeverity } from '@/types/reliability'

import { buildPrompts, fingerprintModule, fingerprintOverview } from './build-prompt'
import { isReliabilityAiObserverEnabled } from './kill-switch'
import {
  type AiObservationInput,
  generateAiObservationId,
  generateAiSweepRunId,
  getLatestFingerprint,
  recordAiObservation
} from './persist'

/**
 * TASK-638 — Runner del AI Observer (host-agnostic).
 *
 * Diseñado para correr desde:
 *  - ops-worker (Cloud Run) invocado por Cloud Scheduler (host canónico)
 *  - test harness o invocación manual desde un script
 *
 * NO depende de Next.js, Vercel cron, ni request headers. Toda config viene
 * de env + DB. Esto permite testear sin levantar el portal y mantener el
 * contrato del runner aislado del host que lo invoque.
 *
 * Flujo:
 *  1. Verifica kill-switch — si OFF, retorna skip inmediato (costo cero).
 *  2. Carga `getReliabilityOverview()` (snapshot canónico).
 *  3. Construye prompts sanitizados + context fingerprintable.
 *  4. Llama Gemini Flash via Vertex AI con `responseMimeType: application/json`.
 *  5. Parsea la respuesta y normaliza per-módulo + overview.
 *  6. Para cada observation, compara fingerprint contra `getLatestFingerprint`.
 *     - Si igual: skip (dedup).
 *     - Si distinto: persist via `recordAiObservation`.
 *  7. Retorna sweep summary con counts.
 */

const VALID_SEVERITIES: ReadonlySet<ReliabilitySeverity> = new Set([
  'ok',
  'warning',
  'error',
  'unknown',
  'not_configured',
  'awaiting_data'
])

const VALID_MODULE_KEYS: ReadonlySet<ReliabilityModuleKey> = new Set([
  'finance',
  'integrations.notion',
  'cloud',
  'delivery'
])

interface AiOverviewResponse {
  overviewSummary: string
  overviewSeverity: ReliabilitySeverity
  modules: Array<{
    moduleKey: ReliabilityModuleKey
    severity: ReliabilitySeverity
    summary: string
    recommendedAction: string | null
  }>
}

export type AiSweepTriggerSource = 'cron' | 'manual' | 'cloud_scheduler'

export interface AiSweepSummary {
  sweepRunId: string
  startedAt: string
  finishedAt: string
  triggeredBy: AiSweepTriggerSource
  durationMs: number
  model: string

  /** observations evaluadas (overview + 1 por módulo presente en respuesta) */
  observationsEvaluated: number

  /** observations persistidas (fingerprint cambió) */
  observationsPersisted: number

  /** observations dedup-skipped (mismo fingerprint que la última) */
  observationsSkipped: number
  promptTokens: number | null
  outputTokens: number | null
  skippedReason: string | null
}

export interface AiSweepResult {
  summary: AiSweepSummary
  observations: AiObservationInput[]
}

interface RunAiObserverArgs {
  triggeredBy?: AiSweepTriggerSource
  env?: NodeJS.ProcessEnv

  /** override para tests: snapshot precargado, evita doble fetch */
  preloadedOverview?: ReliabilityOverview

  /**
   * Bypassa el dedup de fingerprint y siempre persiste. Útil para validar
   * cambios al prompt o al schema de respuesta sin esperar que cambie el
   * estado RCP. Solo se debe usar en triggers manuales — Cloud Scheduler
   * NUNCA debe pasar force=true (defeats the dedup purpose).
   */
  force?: boolean
}

const stripJsonFence = (raw: string): string => {
  const trimmed = raw.trim()

  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/, '').replace(/```$/, '').trim()
  }

  return trimmed
}

const safeParseJson = (raw: string): AiOverviewResponse | null => {
  try {
    const cleaned = stripJsonFence(raw)
    const parsed = JSON.parse(cleaned)

    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.overviewSummary !== 'string') return null
    if (!VALID_SEVERITIES.has(parsed.overviewSeverity)) return null
    if (!Array.isArray(parsed.modules)) return null

    return parsed as AiOverviewResponse
  } catch {
    return null
  }
}

const buildSummary = (
  base: { sweepRunId: string; startedAt: Date; triggeredBy: AiSweepTriggerSource; model: string },
  overrides: Partial<AiSweepSummary>
): AiSweepSummary => {
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

export const runReliabilityAiObserver = async ({
  triggeredBy = 'cron',
  env = process.env,
  preloadedOverview,
  force = false
}: RunAiObserverArgs = {}): Promise<AiSweepResult> => {
  const startedAt = new Date()
  const sweepRunId = generateAiSweepRunId()
  const { model } = getGreenhouseAgentRuntimeConfig()

  if (!isReliabilityAiObserverEnabled(env)) {
    return {
      summary: buildSummary(
        { sweepRunId, startedAt, triggeredBy, model },
        { skippedReason: 'RELIABILITY_AI_OBSERVER_ENABLED=false (opt-in default OFF)' }
      ),
      observations: []
    }
  }

  const overview = preloadedOverview ?? (await getReliabilityOverview())

  const { systemPrompt, userPrompt } = buildPrompts(overview)

  const client = await getGoogleGenAIClient()

  const response = await client.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  })

  const rawText = response.text?.trim()

  if (!rawText) {
    return {
      summary: buildSummary(
        { sweepRunId, startedAt, triggeredBy, model },
        { skippedReason: 'Gemini returned empty response' }
      ),
      observations: []
    }
  }

  const parsed = safeParseJson(rawText)

  if (!parsed) {
    return {
      summary: buildSummary(
        { sweepRunId, startedAt, triggeredBy, model },
        { skippedReason: 'Gemini response was not valid JSON conforming to schema' }
      ),
      observations: []
    }
  }

  const usage = response.usageMetadata
  const promptTokens = typeof usage?.promptTokenCount === 'number' ? usage.promptTokenCount : null
  const outputTokens = typeof usage?.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : null

  const observedAt = new Date().toISOString()
  const persisted: AiObservationInput[] = []
  let evaluated = 0
  let skipped = 0

  // 1. Overview observation
  evaluated += 1
  const overviewFingerprint = fingerprintOverview(overview)
  const lastOverviewFingerprint = await getLatestFingerprint('overview', 'overview')

  if (force || lastOverviewFingerprint !== overviewFingerprint) {
    const observation: AiObservationInput = {
      observationId: generateAiObservationId(),
      sweepRunId,
      moduleKey: 'overview',
      scope: 'overview',
      severity: parsed.overviewSeverity,
      fingerprint: overviewFingerprint,
      summary: parsed.overviewSummary,
      recommendedAction: null,
      model,
      promptTokens,
      outputTokens,
      observedAt
    }

    await recordAiObservation(observation)
    persisted.push(observation)
  } else {
    skipped += 1
  }

  // 2. Per-module observations
  for (const moduleEntry of parsed.modules) {
    if (!VALID_MODULE_KEYS.has(moduleEntry.moduleKey)) continue
    if (!VALID_SEVERITIES.has(moduleEntry.severity)) continue
    if (typeof moduleEntry.summary !== 'string' || moduleEntry.summary.trim().length === 0) continue

    const moduleSnapshot = overview.modules.find(m => m.moduleKey === moduleEntry.moduleKey)

    if (!moduleSnapshot) continue

    evaluated += 1
    const moduleFp = fingerprintModule(moduleSnapshot)
    const lastFp = await getLatestFingerprint('module', moduleEntry.moduleKey)

    if (!force && lastFp === moduleFp) {
      skipped += 1
      continue
    }

    const observation: AiObservationInput = {
      observationId: generateAiObservationId(),
      sweepRunId,
      moduleKey: moduleEntry.moduleKey,
      scope: 'module',
      severity: moduleEntry.severity,
      fingerprint: moduleFp,
      summary: moduleEntry.summary,
      recommendedAction:
        typeof moduleEntry.recommendedAction === 'string' && moduleEntry.recommendedAction.trim().length > 0
          ? moduleEntry.recommendedAction
          : null,
      model,
      promptTokens,
      outputTokens,
      observedAt
    }

    await recordAiObservation(observation)
    persisted.push(observation)
  }

  return {
    summary: buildSummary(
      { sweepRunId, startedAt, triggeredBy, model },
      {
        observationsEvaluated: evaluated,
        observationsPersisted: persisted.length,
        observationsSkipped: skipped,
        promptTokens,
        outputTokens
      }
    ),
    observations: persisted
  }
}
