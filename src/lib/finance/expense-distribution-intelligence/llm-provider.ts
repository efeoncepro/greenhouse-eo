import 'server-only'

import { getGoogleGenAIClient, getGreenhouseAgentRuntimeConfig } from '@/lib/ai/google-genai'

import { generateExpenseDistributionSuggestionId } from './ids'
import { parseExpenseDistributionSuggestionArray } from './validation'
import type { ExpenseDistributionSuggestionPayload } from './types'

const stripJsonFence = (raw: string) => {
  const trimmed = raw.trim()

  if (!trimmed.startsWith('```')) return trimmed

  return trimmed.replace(/^```(?:json)?\s*/, '').replace(/```$/, '').trim()
}

export interface GenerateLlmExpenseDistributionSuggestionsResult {
  suggestions: ExpenseDistributionSuggestionPayload[]
  modelId: string
  tokensIn: number | null
  tokensOut: number | null
  latencyMs: number
  rawOutput: Record<string, unknown>
}

export const generateLlmExpenseDistributionSuggestions = async ({
  systemPrompt,
  userPrompt
}: {
  systemPrompt: string
  userPrompt: string
}): Promise<GenerateLlmExpenseDistributionSuggestionsResult> => {
  const startedAt = Date.now()
  const { model } = getGreenhouseAgentRuntimeConfig()
  const client = await getGoogleGenAIClient()

  const response = await client.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.1,
      responseMimeType: 'application/json',
      maxOutputTokens: 4096,
      thinkingConfig: { thinkingBudget: 0 }
    }
  })

  const text = response.text?.trim()

  if (!text) {
    return {
      suggestions: [],
      modelId: model,
      tokensIn: response.usageMetadata?.promptTokenCount ?? null,
      tokensOut: response.usageMetadata?.candidatesTokenCount ?? null,
      latencyMs: Date.now() - startedAt,
      rawOutput: { error: 'empty_response' }
    }
  }

  const parsed = JSON.parse(stripJsonFence(text)) as Record<string, unknown>

  return {
    suggestions: parseExpenseDistributionSuggestionArray(parsed, generateExpenseDistributionSuggestionId),
    modelId: model,
    tokensIn: response.usageMetadata?.promptTokenCount ?? null,
    tokensOut: response.usageMetadata?.candidatesTokenCount ?? null,
    latencyMs: Date.now() - startedAt,
    rawOutput: parsed
  }
}
