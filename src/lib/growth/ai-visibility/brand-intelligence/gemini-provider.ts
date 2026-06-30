import 'server-only'

/**
 * TASK-1288 — Brand Intelligence · Gemini adapter (default low-cost).
 *
 * Wraps the canonical `generateStructuredGemini` (Vertex; NEVER instantiates the SDK).
 * Gemini flash-lite is the cheapest structured tier — the default for the grounded read.
 */

import { generateStructuredGemini, isGeminiConfigured } from '@/lib/ai/google-genai'

import {
  type BrandIntelligenceInput,
  type BrandIntelligenceProvider,
  type BrandIntelligenceProviderResponse,
  type BrandIntelligenceRawOutput
} from './contracts'
import {
  BRAND_INTELLIGENCE_JSON_SCHEMA,
  BRAND_INTELLIGENCE_SYSTEM_PROMPT,
  buildBrandIntelligencePrompt
} from './prompt'

export const resolveGeminiBrandIntelligenceModel = (env: NodeJS.ProcessEnv = process.env): string | undefined =>
  env.GROWTH_AI_VISIBILITY_BRAND_INTELLIGENCE_MODEL_GEMINI?.trim() || undefined

export const geminiBrandIntelligenceProvider: BrandIntelligenceProvider = {
  id: 'gemini',

  isConfigured: async () => isGeminiConfigured(),

  extract: async (input: BrandIntelligenceInput): Promise<BrandIntelligenceProviderResponse> => {
    const result = await generateStructuredGemini<BrandIntelligenceRawOutput>({
      model: resolveGeminiBrandIntelligenceModel(),
      system: BRAND_INTELLIGENCE_SYSTEM_PROMPT,
      prompt: buildBrandIntelligencePrompt(input),
      jsonSchema: BRAND_INTELLIGENCE_JSON_SCHEMA as unknown as Record<string, unknown>,
      maxOutputTokens: input.maxTokens,
      temperature: 0
    })

    return { data: result.data, model: result.model, usage: result.usage }
  }
}
