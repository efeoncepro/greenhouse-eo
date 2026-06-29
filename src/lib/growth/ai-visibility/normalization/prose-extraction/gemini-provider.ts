import 'server-only'

/**
 * TASK-1271 — Prose Extraction · Gemini adapter (candidato low-cost).
 *
 * Envuelve el cliente canónico `generateStructuredGemini` (Vertex; NO instancia el
 * SDK). Candidato barato para el cutover evidencia-first; default productivo sigue
 * siendo Anthropic hasta que la eval (Slice 3) apruebe el cambio.
 */

import { generateStructuredGemini, isGeminiConfigured } from '@/lib/ai/google-genai'

import {
  type ProseExtractionInput,
  type ProseExtractionProvider,
  type ProseExtractionProviderResponse,
  type ProseExtractionRawOutput
} from './contracts'
import {
  PROSE_EXTRACTION_JSON_SCHEMA,
  PROSE_EXTRACTION_SYSTEM_PROMPT,
  buildProseExtractionPrompt
} from './prompt'

export const resolveGeminiExtractionModel = (env: NodeJS.ProcessEnv = process.env): string | undefined =>
  env.GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_MODEL_GEMINI?.trim() || undefined

export const geminiProseProvider: ProseExtractionProvider = {
  id: 'gemini',

  // Vertex via ADC: configurado si hay project id (no lanza). El secret real se
  // resuelve server-side; la falta de credencial degrada honesto en `extract`.
  isConfigured: async () => isGeminiConfigured(),

  extract: async (input: ProseExtractionInput): Promise<ProseExtractionProviderResponse> => {
    const result = await generateStructuredGemini<ProseExtractionRawOutput>({
      model: resolveGeminiExtractionModel(),
      system: PROSE_EXTRACTION_SYSTEM_PROMPT,
      prompt: buildProseExtractionPrompt(input),
      jsonSchema: PROSE_EXTRACTION_JSON_SCHEMA as unknown as Record<string, unknown>,
      maxOutputTokens: input.maxTokens,
      temperature: 0
    })

    return { data: result.data, model: result.model, usage: result.usage }
  }
}
