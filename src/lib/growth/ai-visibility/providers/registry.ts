import 'server-only'

/**
 * TASK-1226 — Growth AI Visibility Grader · Provider registry (Slice 3, server-only).
 *
 * Ensambla los adapters reales por provider. Es server-only (cada adapter importa
 * el cliente canónico de src/lib/ai). El run-engine/endpoint/smoke lo consumen;
 * los tests puros usan el fake adapter directo (no este registry). Sin flag/secret
 * cada adapter resuelve skip limpio por construcción.
 */

import { GROWTH_AI_VISIBILITY_PROVIDER_IDS, type GrowthAiVisibilityProviderId } from '../contracts'
import { createAnthropicProviderAdapter } from './anthropic-adapter'
import { createGeminiProviderAdapter } from './gemini-adapter'
import { createOpenAIProviderAdapter } from './openai-adapter'
import { createPerplexityProviderAdapter } from './perplexity-adapter'
import { type ProviderAdapter } from './types'

export const createGrowthAiVisibilityProviderAdapters = (): Record<
  GrowthAiVisibilityProviderId,
  ProviderAdapter
> => ({
  openai: createOpenAIProviderAdapter(),
  anthropic: createAnthropicProviderAdapter(),
  perplexity: createPerplexityProviderAdapter(),
  gemini: createGeminiProviderAdapter()
})

export const createGrowthAiVisibilityProviderAdapter = (
  provider: GrowthAiVisibilityProviderId
): ProviderAdapter => createGrowthAiVisibilityProviderAdapters()[provider]

export const GROWTH_AI_VISIBILITY_REGISTERED_PROVIDERS = [...GROWTH_AI_VISIBILITY_PROVIDER_IDS]
