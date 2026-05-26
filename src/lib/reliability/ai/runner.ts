import 'server-only'

import { Type } from '@google/genai'

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

  /**
   * TASK-937 — `finishReason` del candidate de Gemini en el path que falló
   * (parse-fail / empty response). `MAX_TOKENS` distingue "truncado por
   * budget" de "JSON malformado" — diagnóstico clave para el heartbeat.
   * null cuando el sweep no falló o no hay candidate.
   */
  finishReason: string | null
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

const AI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  required: ['overviewSummary', 'overviewSeverity', 'modules'],
  propertyOrdering: ['overviewSummary', 'overviewSeverity', 'modules'],
  properties: {
    overviewSummary: { type: Type.STRING, maxLength: '320' },
    overviewSeverity: {
      type: Type.STRING,
      format: 'enum',
      enum: ['ok', 'warning', 'error', 'unknown', 'not_configured', 'awaiting_data']
    },
    modules: {
      type: Type.ARRAY,
      maxItems: '4',
      items: {
        type: Type.OBJECT,
        required: ['moduleKey', 'severity', 'summary', 'recommendedAction'],
        propertyOrdering: ['moduleKey', 'severity', 'summary', 'recommendedAction'],
        properties: {
          moduleKey: {
            type: Type.STRING,
            format: 'enum',
            enum: ['finance', 'integrations.notion', 'cloud', 'delivery']
          },
          severity: {
            type: Type.STRING,
            format: 'enum',
            enum: ['ok', 'warning', 'error', 'unknown', 'not_configured', 'awaiting_data']
          },
          summary: { type: Type.STRING, maxLength: '220' },
          recommendedAction: { type: Type.STRING, nullable: true, maxLength: '180' }
        }
      }
    }
  }
} as const

const BASE_GENERATION_CONFIG = {
  temperature: 0.1,
  responseMimeType: 'application/json',
  responseSchema: AI_RESPONSE_SCHEMA,
  maxOutputTokens: 4096,

  /**
   * TASK-937 — gemini-2.5-flash tiene *thinking* ON por default y quema el
   * budget de output en reasoning tokens, truncando el JSON estructurado
   * (`unbalanced_or_truncated_json` en ~5/6 corridas). La tarea es extracción
   * determinística de un snapshot — baja necesidad de reasoning. Apagar
   * thinking libera el budget y, junto con `responseSchema` (constrained
   * decoding), garantiza JSON válido. También baja costo y latencia.
   */
  thinkingConfig: { thinkingBudget: 0 }
} as const

const stripJsonFence = (raw: string): string => {
  const trimmed = raw.trim()

  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/, '').replace(/```$/, '').trim()
  }

  return trimmed
}

const findBalancedJsonObject = (raw: string): string | null => {
  const start = raw.indexOf('{')

  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < raw.length; i += 1) {
    const char = raw[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') depth += 1
    if (char === '}') depth -= 1

    if (depth === 0) return raw.slice(start, i + 1)
  }

  return null
}

const safeParseJson = (raw: string): AiOverviewResponse | null => {
  try {
    const fenced = stripJsonFence(raw)
    const cleaned = fenced.startsWith('{') ? fenced : findBalancedJsonObject(fenced)

    if (!cleaned) return null

    const parsed = JSON.parse(cleaned)

    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.overviewSummary !== 'string') return null
    if (!VALID_SEVERITIES.has(parsed.overviewSeverity)) return null
    if (!Array.isArray(parsed.modules)) return null

    /**
     * Normalize each module: missing or empty `recommendedAction` becomes null.
     * Invalid module entries are dropped without rejecting the full response.
     */
    const validModules = parsed.modules
      .filter(
        (m: { moduleKey?: unknown; severity?: unknown; summary?: unknown }) =>
          typeof m.moduleKey === 'string' &&
          typeof m.severity === 'string' &&
          typeof m.summary === 'string' &&
          m.summary.trim().length > 0
      )
      .map((m: { recommendedAction?: unknown; [k: string]: unknown }) => ({
        ...m,
        recommendedAction:
          typeof m.recommendedAction === 'string' && m.recommendedAction.trim().length > 0
            ? m.recommendedAction.trim()
            : null
      }))

    return { ...parsed, modules: validModules } as AiOverviewResponse
  } catch {
    return null
  }
}

const describeInvalidJsonResponse = (raw: string): string => {
  const trimmed = raw.trim()

  if (trimmed.length === 0) return 'empty'
  if (!trimmed.includes('{')) return 'no_json_object'
  if (!findBalancedJsonObject(trimmed)) return 'unbalanced_or_truncated_json'

  return 'schema_mismatch'
}

const buildRetryPrompt = (userPrompt: string, invalidReason: string): string =>
  `${userPrompt}

La respuesta anterior del modelo fue rechazada por el parser (${invalidReason}).
Regenera SOLO el JSON valido, compacto, sin markdown, maximo 4 modulos y usando null para recommendedAction cuando no aplique.`

export const __reliabilityAiRunnerInternalsForTests = {
  safeParseJson,
  describeInvalidJsonResponse,
  findBalancedJsonObject,
  AI_RESPONSE_SCHEMA
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
    finishReason: null,
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
      ...BASE_GENERATION_CONFIG
    }
  })

  const rawText = response.text?.trim()

  if (!rawText) {
    return {
      summary: buildSummary(
        { sweepRunId, startedAt, triggeredBy, model },
        {
          skippedReason: 'Gemini returned empty response',
          finishReason: response.candidates?.[0]?.finishReason ?? null
        }
      ),
      observations: []
    }
  }

  let parsed = safeParseJson(rawText)
  let responseForUsage = response
  let invalidJsonReason: string | null = null

  if (!parsed) {
    invalidJsonReason = describeInvalidJsonResponse(rawText)

    const retryResponse = await client.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: buildRetryPrompt(userPrompt, invalidJsonReason) }] }],
      config: {
        systemInstruction: systemPrompt,
        ...BASE_GENERATION_CONFIG,
        maxOutputTokens: 1536
      }
    })

    const retryRawText = retryResponse.text?.trim()

    if (retryRawText) {
      parsed = safeParseJson(retryRawText)
      responseForUsage = retryResponse
      if (!parsed) invalidJsonReason = describeInvalidJsonResponse(retryRawText)
    }
  }

  if (!parsed) {
    console.warn('[ai-observer] JSON parse failed after schema retry', {
      reason: invalidJsonReason ?? 'unknown',
      initialChars: rawText.length
    })

    return {
      summary: buildSummary(
        { sweepRunId, startedAt, triggeredBy, model },
        {
          skippedReason: `Gemini response was not valid JSON after schema retry (${invalidJsonReason ?? 'unknown'})`,
          finishReason: responseForUsage.candidates?.[0]?.finishReason ?? null
        }
      ),
      observations: []
    }
  }

  const usage = responseForUsage.usageMetadata
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
