import 'server-only'

/**
 * TASK-1226 — Growth AI Visibility Grader · Gemini adapter (Slice 3).
 * Reusa el cliente canónico `src/lib/ai/google-genai.ts` (Vertex + Google Search
 * grounding). Sin credenciales/flag → skip limpio. `timeoutMs` no aplica al SDK
 * Vertex (no expone abort por request); el cap de costo se mantiene vía policy.
 */

import {
  GEMINI_GROUNDED_DEFAULT_MODEL,
  isGeminiConfigured,
  runGeminiGroundedSearch
} from '@/lib/ai/google-genai'

import { normalizeDomain } from '../observation'
import { type ProviderAdapter } from './types'
import { createWebSearchAdapter } from './web-search-adapter'

export const createGeminiProviderAdapter = (options: { model?: string } = {}): ProviderAdapter =>
  createWebSearchAdapter({
    provider: 'gemini',
    defaultModel: options.model?.trim() || GEMINI_GROUNDED_DEFAULT_MODEL,
    isConfigured: async () => isGeminiConfigured(),
    runCall: async ({ prompt, model }) => {
      const result = await runGeminiGroundedSearch({ prompt, model })

      return {
        ok: result.ok,
        httpStatus: null,
        model: result.model,
        text: result.text,
        // Gemini/Vertex grounding: el `url` es un redirect `vertexaisearch...` y el
        // dominio real viene en el `title` (TASK-1233). Pasar el title como domain
        // explícito → buildCitation lo usa para la desambiguación por dominio.
        citations: result.citations.map(c => ({ url: c.url, title: c.title, domain: normalizeDomain(c.title) })),
        usage: result.usage,
        latencyMs: result.latencyMs
      }
    }
  })
