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

  // Orden cheap-first; si se fuerza un provider (eval/shadow), va primero.
  const order: BrandIntelligenceProviderId[] = options?.provider
    ? [options.provider, ...BRAND_INTELLIGENCE_PROVIDER_IDS.filter(id => id !== options.provider)]
    : [...BRAND_INTELLIGENCE_PROVIDER_IDS]

  // Resiliencia (fix 2026-07-02): CAER al siguiente provider cuando uno no está configurado O su
  // `extract()` falla O devuelve un shape inválido. Antes sólo caía en `isConfigured()=false`, así
  // que un provider que se auto-declaraba configurado pero erroraba (p.ej. Gemini/Vertex con
  // credencial rota) tumbaba TODA la lectura aunque OpenAI/Anthropic estuvieran sanos → categoría
  // `unknown` → runs saltados. Ahora un provider caído no bloquea a los sanos.
  let lastStatus: BrandIntelligenceResult['metadata']['status'] = 'not_configured'
  let lastProviderId: BrandIntelligenceProviderId | null = null

  for (const id of order) {
    const provider = PROVIDER_REGISTRY[id]
    const configured = await provider.isConfigured().catch(() => false)

    if (!configured) continue

    lastProviderId = provider.id
    const started = Date.now()

    try {
      const response = await provider.extract(input)
      const latencyMs = Date.now() - started
      const fields = sanitizeBrandIntelligenceOutput(response.data)

      if (!fields) {
        lastStatus = 'schema_invalid'
        continue
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
      captureWithDomain(error, 'growth', {
        tags: { source: 'growth_ai_visibility_brand_intelligence', provider: provider.id },
        extra: { ...options?.telemetry }
      })

      lastStatus = 'provider_error'
      // cae al siguiente provider del orden
    }
  }

  return { fields: null, metadata: fallbackMetadata(lastStatus, lastProviderId) }
}
