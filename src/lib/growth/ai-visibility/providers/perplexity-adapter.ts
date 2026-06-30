import 'server-only'

/**
 * TASK-1226 — Growth AI Visibility Grader · Perplexity adapter (Slice 3).
 * Reusa el cliente canónico `src/lib/ai/perplexity.ts` (Sonar). Sin credenciales
 * aún → skip limpio (missing_secret) hasta que se provisione el secret.
 */

import { PERPLEXITY_DEFAULT_MODEL, isPerplexityConfigured, runPerplexitySearch } from '@/lib/ai/perplexity'

import { type ProviderAdapter } from './types'
import { createWebSearchAdapter } from './web-search-adapter'

export const createPerplexityProviderAdapter = (options: { model?: string } = {}): ProviderAdapter =>
  createWebSearchAdapter({
    provider: 'perplexity',
    defaultModel: options.model?.trim() || PERPLEXITY_DEFAULT_MODEL,
    isConfigured: isPerplexityConfigured,
    runCall: async ({ prompt, model, timeoutMs }) => {
      const result = await runPerplexitySearch({ prompt, model, timeoutMs })

      return {
        ok: result.ok,
        httpStatus: result.httpStatus,
        model: result.model,
        text: result.text,
        citations: result.citations,
        usage: result.usage,
        latencyMs: result.latencyMs
      }
    }
  })
