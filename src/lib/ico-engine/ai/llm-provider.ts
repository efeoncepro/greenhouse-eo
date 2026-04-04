import 'server-only'

import { getGoogleGenAIClient, getGreenhouseAgentModel } from '@/lib/ai/google-genai'

import type { AiSignalRecord } from './types'
import {
  ICO_LLM_DEFAULT_MODEL_ID,
  ICO_LLM_PROMPT_TEMPLATE,
  type AiSignalEnrichmentModelOutput
} from './llm-types'

export interface GenerateAiSignalEnrichmentInput {
  signal: AiSignalRecord
  promptVersion: string
  promptHash: string
  modelId?: string | null
}

export interface GenerateAiSignalEnrichmentResult {
  output: AiSignalEnrichmentModelOutput
  modelId: string
  promptVersion: string
  promptHash: string
  tokensIn: number | null
  tokensOut: number | null
  latencyMs: number
}

const ICO_SIGNAL_ENRICHMENT_JSON_SCHEMA = {
  type: 'object',
  required: ['qualityScore', 'explanationSummary', 'rootCauseNarrative', 'recommendedAction', 'confidence'],
  properties: {
    qualityScore: { type: 'number' },
    explanationSummary: { type: 'string' },
    rootCauseNarrative: { type: 'string' },
    recommendedAction: { type: 'string' },
    confidence: { type: 'number' }
  }
} as const

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const parseStructuredJson = (text: string): AiSignalEnrichmentModelOutput => {
  const parsed = JSON.parse(text) as Partial<AiSignalEnrichmentModelOutput>

  if (
    typeof parsed.qualityScore !== 'number' ||
    typeof parsed.explanationSummary !== 'string' ||
    typeof parsed.rootCauseNarrative !== 'string' ||
    typeof parsed.recommendedAction !== 'string' ||
    typeof parsed.confidence !== 'number'
  ) {
    throw new Error('LLM response did not match the expected enrichment contract')
  }

  return {
    qualityScore: clamp(Math.round(parsed.qualityScore * 100) / 100, 0, 100),
    explanationSummary: parsed.explanationSummary.trim(),
    rootCauseNarrative: parsed.rootCauseNarrative.trim(),
    recommendedAction: parsed.recommendedAction.trim(),
    confidence: clamp(Math.round(parsed.confidence * 10_000) / 10_000, 0, 1)
  }
}

const buildSignalPrompt = (signal: AiSignalRecord) =>
  [
    ICO_LLM_PROMPT_TEMPLATE,
    '',
    'Reglas adicionales:',
    '- Devuelve un qualityScore entre 0 y 100.',
    '- confidence debe ir entre 0 y 1.',
    '- explanationSummary resume la señal y el riesgo operativo.',
    '- rootCauseNarrative explica la causa probable usando solo la evidencia visible.',
    '- recommendedAction propone una acción concreta, breve y accionable.',
    '- Si la señal tiene evidencia limitada, dilo en la explicación.',
    '',
    'Signal materializado:',
    JSON.stringify(signal, null, 2)
  ].join('\n')

export const generateAiSignalEnrichment = async (
  input: GenerateAiSignalEnrichmentInput
): Promise<GenerateAiSignalEnrichmentResult> => {
  const client = await getGoogleGenAIClient()
  const modelId = input.modelId?.trim() || getGreenhouseAgentModel() || ICO_LLM_DEFAULT_MODEL_ID
  const startedAt = Date.now()

  const response = await client.models.generateContent({
    model: modelId,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: buildSignalPrompt(input.signal)
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
