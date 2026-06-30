import 'server-only'

/**
 * TASK-1271 — Prose Extraction · OpenAI adapter (candidato low-cost).
 *
 * Envuelve el cliente canónico `generateStructuredOpenAI` (Responses API json_schema
 * strict; NO instancia SDK/fetch crudo propio). Candidato barato para el cutover
 * evidencia-first; default productivo sigue siendo Anthropic hasta la eval (Slice 3).
 */

import { generateStructuredOpenAI, isOpenAIConfigured } from '@/lib/ai/openai'

import {
  type ProseExtractionInput,
  type ProseExtractionProvider,
  type ProseExtractionProviderResponse,
  type ProseExtractionRawOutput
} from './contracts'
import {
  PROSE_EXTRACTION_JSON_SCHEMA,
  PROSE_EXTRACTION_SYSTEM_PROMPT,
  PROSE_EXTRACTION_TOOL_NAME,
  buildProseExtractionPrompt
} from './prompt'

export const resolveOpenAiExtractionModel = (env: NodeJS.ProcessEnv = process.env): string | undefined =>
  env.GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_MODEL_OPENAI?.trim() || undefined

export const openAiProseProvider: ProseExtractionProvider = {
  id: 'openai',

  isConfigured: () => isOpenAIConfigured(),

  extract: async (input: ProseExtractionInput): Promise<ProseExtractionProviderResponse> => {
    const result = await generateStructuredOpenAI<ProseExtractionRawOutput>({
      model: resolveOpenAiExtractionModel(),
      system: PROSE_EXTRACTION_SYSTEM_PROMPT,
      prompt: buildProseExtractionPrompt(input),
      schemaName: PROSE_EXTRACTION_TOOL_NAME,
      jsonSchema: PROSE_EXTRACTION_JSON_SCHEMA as unknown as Record<string, unknown>,
      maxOutputTokens: input.maxTokens,
      temperature: 0
    })

    return { data: result.data, model: result.model, usage: result.usage }
  }
}
