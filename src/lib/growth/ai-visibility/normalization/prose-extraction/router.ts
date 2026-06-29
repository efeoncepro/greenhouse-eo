import 'server-only'

/**
 * TASK-1271 — Growth AI Visibility · Prose Extraction Router.
 *
 * Único punto de entrada del extractor de prosa: resuelve el proveedor por flag
 * (default `anthropic`, behavior-preserving), valida/sanitiza el output, estima el
 * costo y SIEMPRE degrada honesto (fallback determinista) ante flag OFF, secret
 * faltante, excerpt vacío, schema inválido o error de proveedor. NUNCA lanza.
 *
 * Reglas duras:
 *  - El error crudo va a `captureWithDomain('growth')`, NUNCA al caller/cliente.
 *  - `fields=null` ⇒ el caller conserva el finding determinista intacto.
 *  - La metadata (provider/model/cost/usage) es interna (eval/observabilidad).
 */

import { captureWithDomain } from '@/lib/observability/capture'

import { isLlmExtractionEnabled, resolveProseExtractionConfig } from '../../flags'
import { anthropicProseProvider } from './anthropic-provider'
import {
  PROSE_EXTRACTION_VERSION,
  sanitizeProseExtractionOutput,
  type ProseExtractionInput,
  type ProseExtractionMetadata,
  type ProseExtractionProvider,
  type ProseExtractionProviderId,
  type ProseExtractionResult,
  type ProseExtractionStatus,
  type ProseExtractionUsage
} from './contracts'

/**
 * Pricing referencial del extractor (USD por 1M tokens), tier barato. NO es
 * contabilidad exacta — sólo guard de presupuesto. Verificar contra pricing vigente
 * al calibrar (Slice 3). Los candidatos low-cost se registran al implementarlos.
 */
const EXTRACTION_PRICING: Record<ProseExtractionProviderId, { inputPerMillion: number; outputPerMillion: number }> = {
  anthropic: { inputPerMillion: 0.8, outputPerMillion: 4 },
  gemini: { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  openai: { inputPerMillion: 0.1, outputPerMillion: 0.4 }
}

/**
 * Registry de adapters registrados. Slice 1 registra sólo `anthropic`
 * (behavior-preserving); Slice 2 agrega `gemini`/`openai`. Si el flag selecciona un
 * proveedor NO registrado, el router degrada honesto (`not_configured`).
 */
const PROVIDER_REGISTRY: Partial<Record<ProseExtractionProviderId, ProseExtractionProvider>> = {
  anthropic: anthropicProseProvider
}

/** Acceso de sólo lectura al registry (consumido por el harness de eval, Slice 3). */
export const getRegisteredProseProvider = (
  id: ProseExtractionProviderId
): ProseExtractionProvider | undefined => PROVIDER_REGISTRY[id]

export const estimateExtractionCostUsd = (
  providerId: ProseExtractionProviderId,
  usage: ProseExtractionUsage
): number => {
  const pricing = EXTRACTION_PRICING[providerId]

  const cost =
    (usage.inputTokens / 1_000_000) * pricing.inputPerMillion +
    (usage.outputTokens / 1_000_000) * pricing.outputPerMillion

  return Number(cost.toFixed(6))
}

const fallbackMetadata = (
  status: ProseExtractionStatus,
  providerId: ProseExtractionProviderId | null,
  latencyMs = 0
): ProseExtractionMetadata => ({
  providerId,
  model: null,
  version: PROSE_EXTRACTION_VERSION,
  status,
  costEstimateUsd: 0,
  latencyMs,
  usage: null
})

/**
 * Ejecuta la extracción de prosa por el proveedor configurado. SIEMPRE resuelve un
 * `ProseExtractionResult` (nunca lanza). `provider` explícito permite al harness de
 * eval (Slice 3) forzar un proveedor sin tocar el flag productivo.
 */
export const runProseExtraction = async (
  input: ProseExtractionInput,
  options?: {
    /** Fuerza un proveedor (eval/shadow); omitido → resuelve por flag. */
    provider?: ProseExtractionProviderId
    /** Extras de tracing para Sentry (no PII): runId/promptId del run. */
    telemetry?: Record<string, string | null>
  }
): Promise<ProseExtractionResult> => {
  if (!isLlmExtractionEnabled()) {
    return { fields: null, metadata: fallbackMetadata('disabled', null) }
  }

  if (!input.excerpt || input.excerpt.trim().length === 0) {
    return { fields: null, metadata: fallbackMetadata('empty_excerpt', null) }
  }

  const config = resolveProseExtractionConfig()
  const providerId = options?.provider ?? config.provider
  const provider = PROVIDER_REGISTRY[providerId]

  if (!provider) {
    return { fields: null, metadata: fallbackMetadata('not_configured', providerId) }
  }

  if (!(await provider.isConfigured())) {
    return { fields: null, metadata: fallbackMetadata('not_configured', providerId) }
  }

  const started = Date.now()

  try {
    const response = await provider.extract({ ...input, maxTokens: config.maxOutputTokens })
    const latencyMs = Date.now() - started
    const fields = sanitizeProseExtractionOutput(response.data)

    if (!fields) {
      return { fields: null, metadata: fallbackMetadata('schema_invalid', providerId, latencyMs) }
    }

    const costEstimateUsd = estimateExtractionCostUsd(providerId, response.usage)

    if (costEstimateUsd > config.maxCostUsd) {
      // Guard de presupuesto: registra para alerta, NO descarta el resultado válido.
      captureWithDomain(new Error('prose_extraction_cost_estimate_exceeded'), 'growth', {
        level: 'warning',
        tags: { source: 'growth_ai_visibility_prose_extraction', provider: providerId },
        extra: { ...options?.telemetry, costEstimateUsd, maxCostUsd: config.maxCostUsd }
      })
    }

    return {
      fields,
      metadata: {
        providerId,
        model: response.model,
        version: PROSE_EXTRACTION_VERSION,
        status: 'ok',
        costEstimateUsd,
        latencyMs,
        usage: response.usage
      }
    }
  } catch (error) {
    const latencyMs = Date.now() - started

    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_prose_extraction', provider: providerId },
      extra: { ...options?.telemetry }
    })

    return { fields: null, metadata: fallbackMetadata('provider_error', providerId, latencyMs) }
  }
}
