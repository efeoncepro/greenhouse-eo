import 'server-only'

/**
 * TASK-1288 — Brand Intelligence · OpenAI adapter.
 *
 * Wraps the canonical `generateStructuredOpenAI` (Responses API json_schema; NEVER a raw
 * SDK/fetch). The shared schema carries `minimum`/`maximum`/`maxItems`, so the canonical
 * helper sets `strict:false` and the contract is enforced by `sanitizeBrandIntelligenceOutput`.
 */

import { generateStructuredOpenAI, isOpenAIConfigured } from '@/lib/ai/openai'

import {
  type BrandIntelligenceInput,
  type BrandIntelligenceProvider,
  type BrandIntelligenceProviderResponse,
  type BrandIntelligenceRawOutput
} from './contracts'
import {
  BRAND_INTELLIGENCE_JSON_SCHEMA,
  BRAND_INTELLIGENCE_SYSTEM_PROMPT,
  BRAND_INTELLIGENCE_TOOL_NAME,
  buildBrandIntelligencePrompt
} from './prompt'

export const resolveOpenAiBrandIntelligenceModel = (env: NodeJS.ProcessEnv = process.env): string | undefined =>
  env.GROWTH_AI_VISIBILITY_BRAND_INTELLIGENCE_MODEL_OPENAI?.trim() || undefined

export const openAiBrandIntelligenceProvider: BrandIntelligenceProvider = {
  id: 'openai',

  isConfigured: () => isOpenAIConfigured(),

  extract: async (input: BrandIntelligenceInput): Promise<BrandIntelligenceProviderResponse> => {
    const result = await generateStructuredOpenAI<BrandIntelligenceRawOutput>({
      model: resolveOpenAiBrandIntelligenceModel(),
      system: BRAND_INTELLIGENCE_SYSTEM_PROMPT,
      prompt: buildBrandIntelligencePrompt(input),
      schemaName: BRAND_INTELLIGENCE_TOOL_NAME,
      jsonSchema: BRAND_INTELLIGENCE_JSON_SCHEMA as unknown as Record<string, unknown>,
      maxOutputTokens: input.maxTokens,
      temperature: 0
    })

    return { data: result.data, model: result.model, usage: result.usage }
  }
}
