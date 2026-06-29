import 'server-only'

/**
 * TASK-1288 Slice 4 — Growth AI Visibility · Brand Intelligence Router.
 *
 * Single entry point of the grounded read: gated by the flag, picks the first CONFIGURED
 * provider in cheap-first priority order (gemini → openai → anthropic), validates/sanitizes
 * the output, and ALWAYS degrades honest (fields=null) on flag OFF, no provider configured,
 * no site/entity signals, schema invalid or provider error. NEVER throws.
 *
 * Hard rules:
 *  - The raw error goes to `captureWithDomain('growth')`, NEVER to the caller/client.
 *  - `fields=null` ⇒ the caller falls back to the deterministic prior (HubSpot map + alias).
 *  - The provider/model/usage metadata is internal (observability), never product-facing.
 */

import { captureWithDomain } from '@/lib/observability/capture'

import { isBrandIntelligenceEnabled } from '../flags'
import { anthropicBrandIntelligenceProvider } from './anthropic-provider'
import {
  BRAND_INTELLIGENCE_PROVIDER_IDS,
  BRAND_INTELLIGENCE_VERSION,
  sanitizeBrandIntelligenceOutput,
  type BrandIntelligenceInput,
  type BrandIntelligenceMetadata,
  type BrandIntelligenceProvider,
  type BrandIntelligenceProviderId,
  type BrandIntelligenceResult,
  type BrandIntelligenceStatus
} from './contracts'
import { geminiBrandIntelligenceProvider } from './gemini-provider'
import { openAiBrandIntelligenceProvider } from './openai-provider'

const PROVIDER_REGISTRY: Record<BrandIntelligenceProviderId, BrandIntelligenceProvider> = {
  gemini: geminiBrandIntelligenceProvider,
  openai: openAiBrandIntelligenceProvider,
  anthropic: anthropicBrandIntelligenceProvider
}

export const getRegisteredBrandIntelligenceProvider = (
  id: BrandIntelligenceProviderId
): BrandIntelligenceProvider => PROVIDER_REGISTRY[id]

const fallbackMetadata = (
  status: BrandIntelligenceStatus,
  providerId: BrandIntelligenceProviderId | null,
  latencyMs = 0
): BrandIntelligenceMetadata => ({
  providerId,
  model: null,
  version: BRAND_INTELLIGENCE_VERSION,
  status,
  latencyMs,
  usage: null
})

/** Resolve the first configured provider in cheap-first priority order. */
const resolveConfiguredProvider = async (
  preferred?: BrandIntelligenceProviderId
): Promise<BrandIntelligenceProvider | null> => {
  const order: BrandIntelligenceProviderId[] = preferred
    ? [preferred, ...BRAND_INTELLIGENCE_PROVIDER_IDS.filter(id => id !== preferred)]
    : [...BRAND_INTELLIGENCE_PROVIDER_IDS]

  for (const id of order) {
    const provider = PROVIDER_REGISTRY[id]
    // isConfigured() may throw (e.g. missing Vertex credential) → treat as not configured.
    const configured = await provider.isConfigured().catch(() => false)

    if (configured) return provider
  }

  return null
}

/**
 * Run the grounded read. ALWAYS resolves a `BrandIntelligenceResult` (never throws).
 * `provider` forces a provider (eval/shadow) without touching the flag.
 */
export const runBrandIntelligence = async (
  input: BrandIntelligenceInput,
  options?: {
    provider?: BrandIntelligenceProviderId
    telemetry?: Record<string, string | null>
  }
): Promise<BrandIntelligenceResult> => {
  if (!isBrandIntelligenceEnabled()) {
    return { fields: null, metadata: fallbackMetadata('disabled', null) }
  }

  // No grounding signals at all → don't pay an LLM call to hallucinate; degrade honest.
  if ((!input.siteContent || input.siteContent.trim().length === 0) && !input.entitySignals) {
    return { fields: null, metadata: fallbackMetadata('no_signals', null) }
  }

  const provider = await resolveConfiguredProvider(options?.provider)

  if (!provider) {
    return { fields: null, metadata: fallbackMetadata('not_configured', options?.provider ?? null) }
  }

  const started = Date.now()

  try {
    const response = await provider.extract(input)
    const latencyMs = Date.now() - started
    const fields = sanitizeBrandIntelligenceOutput(response.data)

    if (!fields) {
      return { fields: null, metadata: fallbackMetadata('schema_invalid', provider.id, latencyMs) }
    }

    return {
      fields,
      metadata: {
        providerId: provider.id,
        model: response.model,
        version: BRAND_INTELLIGENCE_VERSION,
        status: 'ok',
        latencyMs,
        usage: response.usage
      }
    }
  } catch (error) {
    const latencyMs = Date.now() - started

    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_brand_intelligence', provider: provider.id },
      extra: { ...options?.telemetry }
    })

    return { fields: null, metadata: fallbackMetadata('provider_error', provider.id, latencyMs) }
  }
}
