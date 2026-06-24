import 'server-only'

/**
 * TASK-1226 — Growth AI Visibility Grader · Anthropic adapter (Slice 3).
 * Reusa el cliente canónico `src/lib/ai/anthropic.ts` (web_search). Anthropic
 * entró al provider set V1 por el ADR delta del spike 1228.
 */

import {
  ANTHROPIC_WEB_SEARCH_DEFAULT_MODEL,
  isAnthropicConfigured,
  runAnthropicWebSearch
} from '@/lib/ai/anthropic'

import { type ProviderAdapter } from './types'
import { createWebSearchAdapter } from './web-search-adapter'

export const createAnthropicProviderAdapter = (options: { model?: string } = {}): ProviderAdapter =>
  createWebSearchAdapter({
    provider: 'anthropic',
    defaultModel: options.model?.trim() || ANTHROPIC_WEB_SEARCH_DEFAULT_MODEL,
    isConfigured: isAnthropicConfigured,
    runCall: async ({ prompt, model, timeoutMs }) => {
      const result = await runAnthropicWebSearch({ prompt, model, timeoutMs })

      return {
        ok: result.ok,
        httpStatus: null,
        model: result.model,
        text: result.text,
        citations: result.citations,
        usage: result.usage,
        latencyMs: result.latencyMs
      }
    }
  })
