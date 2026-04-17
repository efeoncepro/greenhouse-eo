import 'server-only'

import { getGoogleGenAIClient, getGreenhouseAgentModel } from '@/lib/ai/google-genai'

import {
  FINANCE_LLM_DEFAULT_MODEL_ID,
  FINANCE_LLM_PROMPT_TEMPLATE,
  getFinanceMetricById,
  type FinanceSignalEnrichmentModelOutput,
  type FinanceSignalRecord
} from './finance-signal-types'
import type { ResolvedFinanceSignalContext } from './resolve-finance-signal-context'

export interface GenerateFinanceSignalEnrichmentInput {
  signal: FinanceSignalRecord
  promptVersion: string
  promptHash: string
  modelId?: string | null
  resolvedContext?: ResolvedFinanceSignalContext | null
}

export interface GenerateFinanceSignalEnrichmentResult {
  output: FinanceSignalEnrichmentModelOutput
  modelId: string
  promptVersion: string
  promptHash: string
  tokensIn: number | null
  tokensOut: number | null
  latencyMs: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const parseStructuredJson = (text: string): FinanceSignalEnrichmentModelOutput => {
  const parsed = JSON.parse(text) as Partial<FinanceSignalEnrichmentModelOutput>

  if (
    typeof parsed.qualityScore !== 'number' ||
    typeof parsed.explanationSummary !== 'string' ||
    typeof parsed.rootCauseNarrative !== 'string' ||
    typeof parsed.recommendedAction !== 'string' ||
    typeof parsed.confidence !== 'number'
  ) {
    throw new Error('LLM response did not match the expected finance enrichment contract')
  }

  return {
    qualityScore: clamp(Math.round(parsed.qualityScore * 100) / 100, 0, 100),
    explanationSummary: parsed.explanationSummary.trim(),
    rootCauseNarrative: parsed.rootCauseNarrative.trim(),
    recommendedAction: parsed.recommendedAction.trim(),
    confidence: clamp(Math.round(parsed.confidence * 10_000) / 10_000, 0, 1)
  }
}

const enrichSignalPayload = (signal: FinanceSignalRecord, context?: ResolvedFinanceSignalContext | null) => {
  const metricDef = getFinanceMetricById(signal.metricName)

  return {
    ...signal,
    metricDisplayName: metricDef?.shortName ?? signal.metricName,
    metricDescription: metricDef?.description ?? null,
    metricUnit: metricDef?.unit ?? null,
    metricDirection: metricDef ? (metricDef.higherIsBetter ? 'higher is better' : 'lower is better') : null,
    clientName: signal.clientId ? (context?.clients.get(signal.clientId) ?? signal.clientId) : null,
    organizationName: signal.organizationId
      ? (context?.organizations.get(signal.organizationId) ?? signal.organizationId)
      : null,
    spaceName: signal.spaceId ? (context?.spaces.get(signal.spaceId) ?? signal.spaceId) : null
  }
}

const buildFinancePrompt = (signal: FinanceSignalRecord, context?: ResolvedFinanceSignalContext | null) =>
  [
    FINANCE_LLM_PROMPT_TEMPLATE,
    '',
    'Reglas adicionales:',
    '- Devuelve un qualityScore entre 0 y 100.',
    '- confidence debe ir entre 0 y 1.',
    '- explanationSummary resume la señal financiera y el riesgo operativo.',
    '- rootCauseNarrative explica la causa probable usando solo la evidencia visible.',
    '- recommendedAction propone una acción concreta, breve y accionable para el equipo financiero u operativo.',
    '- Si la señal tiene evidencia limitada, dilo en la explicación y baja la confianza.',
    '',
    'Signal materializado:',
    JSON.stringify(enrichSignalPayload(signal, context), null, 2)
  ].join('\n')

export const generateFinanceSignalEnrichment = async (
  input: GenerateFinanceSignalEnrichmentInput
): Promise<GenerateFinanceSignalEnrichmentResult> => {
  const client = await getGoogleGenAIClient()
  const modelId = input.modelId?.trim() || getGreenhouseAgentModel() || FINANCE_LLM_DEFAULT_MODEL_ID
  const startedAt = Date.now()

  const response = await client.models.generateContent({
    model: modelId,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: buildFinancePrompt(input.signal, input.resolvedContext)
          }
        ]
      }
    ] as any,
    config: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: 'application/json'
    }
  })

  const text = response.text?.trim()

  if (!text) {
    throw new Error('LLM response was empty')
  }

  const output = parseStructuredJson(text)

  return {
    output,
    modelId,
    promptVersion: input.promptVersion,
    promptHash: input.promptHash,
    tokensIn: response.usageMetadata?.promptTokenCount ?? null,
    tokensOut: response.usageMetadata?.candidatesTokenCount ?? null,
    latencyMs: Date.now() - startedAt
  }
}
