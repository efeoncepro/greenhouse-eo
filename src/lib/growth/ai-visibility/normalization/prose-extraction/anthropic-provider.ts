import 'server-only'

/**
 * TASK-1271 — Prose Extraction · Anthropic adapter (default behavior-preserving).
 *
 * Envuelve el cliente canónico `generateStructuredAnthropic` (NO instancia el SDK).
 * Reproduce el comportamiento EXACTO del hook original de TASK-1227: mismo modelo
 * Haiku, mismo tool-calling forzado, mismo schema. Es el fallback premium y el
 * default mientras la eval (Slice 3) no apruebe un candidato más barato.
 */

import { type Anthropic } from '@anthropic-ai/sdk'

import { generateStructuredAnthropic, isAnthropicConfigured } from '@/lib/ai/anthropic'

import {
  type ProseExtractionInput,
  type ProseExtractionProvider,
  type ProseExtractionProviderResponse,
  type ProseExtractionRawOutput
} from './contracts'
import {
  PROSE_EXTRACTION_JSON_SCHEMA,
  PROSE_EXTRACTION_SYSTEM_PROMPT,
  PROSE_EXTRACTION_TOOL_DESCRIPTION,
  PROSE_EXTRACTION_TOOL_NAME,
  buildProseExtractionPrompt
} from './prompt'

/** Modelo de extracción Anthropic (Haiku — barato dentro de la familia premium). Override por env. */
export const PROSE_EXTRACTION_ANTHROPIC_DEFAULT_MODEL = 'claude-haiku-4-5-20251001'

export const resolveAnthropicExtractionModel = (env: NodeJS.ProcessEnv = process.env): string =>
  env.GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_MODEL_ANTHROPIC?.trim() || PROSE_EXTRACTION_ANTHROPIC_DEFAULT_MODEL

export const anthropicProseProvider: ProseExtractionProvider = {
  id: 'anthropic',

  isConfigured: () => isAnthropicConfigured(),

  extract: async (input: ProseExtractionInput): Promise<ProseExtractionProviderResponse> => {
    const result = await generateStructuredAnthropic<ProseExtractionRawOutput>({
      model: resolveAnthropicExtractionModel(),
      system: PROSE_EXTRACTION_SYSTEM_PROMPT,
      prompt: buildProseExtractionPrompt(input),
      toolName: PROSE_EXTRACTION_TOOL_NAME,
      toolDescription: PROSE_EXTRACTION_TOOL_DESCRIPTION,
      inputSchema: PROSE_EXTRACTION_JSON_SCHEMA as unknown as Anthropic.Messages.Tool.InputSchema,
      maxTokens: input.maxTokens,
      temperature: 0
    })

    return {
      data: result.data,
      model: result.model,
      usage: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens
      }
    }
  }
}
