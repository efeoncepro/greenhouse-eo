import 'server-only'

/**
 * TASK-1226 — Growth AI Visibility Grader · OpenAI adapter (Slice 3).
 *
 * Primer provider real end-to-end (Delta 2026-06-24). Reusa el cliente canónico
 * `src/lib/ai/openai.ts` (Responses API + web_search) — NO fetch crudo en el
 * dominio, NO SDK paralelo. La lógica de flags/retry/observación vive en el
 * factory genérico `createWebSearchAdapter`.
 */

import {
  OPENAI_RESPONSES_DEFAULT_MODEL,
  isOpenAIConfigured,
  runOpenAIResponsesWebSearch
} from '@/lib/ai/openai'

import { type ProviderAdapter } from './types'
import { createWebSearchAdapter } from './web-search-adapter'

export const createOpenAIProviderAdapter = (options: { model?: string } = {}): ProviderAdapter =>
  createWebSearchAdapter({
    provider: 'openai',
    defaultModel: options.model?.trim() || OPENAI_RESPONSES_DEFAULT_MODEL,
    isConfigured: isOpenAIConfigured,
    runCall: async ({ prompt, model, timeoutMs }) => {
      const result = await runOpenAIResponsesWebSearch({ prompt, model, timeoutMs })

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
