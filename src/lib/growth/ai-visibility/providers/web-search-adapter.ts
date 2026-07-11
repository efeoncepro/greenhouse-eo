import 'server-only'

/**
 * TASK-1226 — Growth AI Visibility Grader · Generic web-search adapter factory (Slice 3).
 *
 * Single source of truth del loop común de los adapters reales (flags skip →
 * retry acotado → observación succeeded/failed → captureWithDomain). Cada
 * provider solo aporta su `runCall` (que llama al cliente canónico de src/lib/ai)
 * y su `isConfigured`. Evita triplicar la lógica de degradación entre
 * OpenAI/Anthropic/Perplexity/Gemini.
 */

import { captureWithDomain } from '@/lib/observability/capture'

import {
  type GrowthAiVisibilityProviderId,
  type GrowthAiVisibilityProviderObservation
} from '../contracts'
import { isGraderEnabled, isProviderFlagEnabled } from '../flags'
import { boundedExcerpt, buildCitations, sha256Hex } from '../observation'
import {
  buildFailedObservation,
  buildSkippedObservation,
  buildSucceededObservation,
  mapHttpStatusToErrorCode,
  mapThrownErrorToErrorCode
} from './observation-builders'
import { type ProviderAdapter, type ProviderAdapterCapabilities } from './types'

export interface WebSearchCallResult {
  ok: boolean
  /** HTTP status para clients fetch-based; null para SDK-based (lanzan en error). */
  httpStatus: number | null
  model: string
  text: string | null
  /** `domain` opcional cuando el provider lo expone aparte del url (ej. Gemini/Vertex). */
  citations: Array<{ url: string; title?: string | null; domain?: string | null }>
  usage: Record<string, unknown>
  latencyMs: number
}

export interface WebSearchAdapterConfig {
  provider: GrowthAiVisibilityProviderId
  defaultModel: string
  supportsWebSearch?: boolean
  /** flag del provider aparte, ¿hay secret/credencial? (no lanza). */
  isConfigured: () => Promise<boolean>
  /** Llamada real al cliente canónico. Devuelve normalizado o lanza (timeout/red). */
  runCall: (input: { prompt: string; model: string; timeoutMs: number }) => Promise<WebSearchCallResult>
}

/**
 * TASK-1390 (ISSUE-120 Gap D) — backoff exponencial + jitter entre reintentos.
 * Antes los retries eran inmediatos: un throttle de cuota (Vertex RESOURCE_EXHAUSTED)
 * mataba TODOS los intentos dentro de la misma ventana. Base 500ms ×3^attempt,
 * cap 4s, jitter ±25%. Inyectable (`sleep`) para tests deterministas.
 */
export const backoffDelayMs = (attempt: number): number => {
  const base = Math.min(500 * Math.pow(3, attempt), 4000)
  const jitter = base * 0.25 * (Math.random() * 2 - 1)

  return Math.max(0, Math.round(base + jitter))
}

const defaultSleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

export const createWebSearchAdapter = (
  config: WebSearchAdapterConfig,
  deps: { sleep?: (ms: number) => Promise<void> } = {}
): ProviderAdapter => {
  const sleep = deps.sleep ?? defaultSleep

  const { provider, defaultModel } = config

  const capabilities: ProviderAdapterCapabilities = {
    provider,
    supportsWebSearch: config.supportsWebSearch ?? true,
    defaultModel
  }

  return {
    provider,
    capabilities,
    isEnabled: async () => isProviderFlagEnabled(provider) && (await config.isConfigured()),
    runPrompt: async (input, context) => {
      const skip = (errorCode: 'grader_disabled' | 'provider_disabled' | 'missing_secret') =>
        buildSkippedObservation({ promptInput: input, context, provider, model: defaultModel, errorCode })

      if (!isGraderEnabled()) {
        return skip('grader_disabled')
      }

      if (!isProviderFlagEnabled(provider)) {
        return skip('provider_disabled')
      }

      if (!(await config.isConfigured())) {
        return skip('missing_secret')
      }

      let lastFailure: GrowthAiVisibilityProviderObservation | null = null

      for (let attempt = 0; attempt <= context.maxRetries; attempt++) {
        try {
          const result = await config.runCall({
            prompt: input.promptText,
            model: defaultModel,
            timeoutMs: context.timeoutMs
          })

          if (!result.ok) {
            const errorCode = mapHttpStatusToErrorCode(result.httpStatus ?? 502)

            lastFailure = buildFailedObservation({
              promptInput: input,
              context,
              provider,
              model: result.model,
              errorCode,
              latencyMs: result.latencyMs
            })

            if (errorCode === 'rate_limited' || (result.httpStatus ?? 0) >= 500) {
              if (attempt < context.maxRetries) {
                await sleep(backoffDelayMs(attempt))
              }

              continue
            }

            return lastFailure
          }

          return buildSucceededObservation({
            promptInput: input,
            context,
            provider,
            model: result.model,
            answerTextHash: result.text ? sha256Hex(result.text) : null,
            answerExcerpt: boundedExcerpt(result.text),
            citations: buildCitations(result.citations.map(c => ({ url: c.url, title: c.title ?? null, domain: c.domain ?? null }))),
            usage: result.usage,
            latencyMs: result.latencyMs,
            rawEvidencePointer: null
          })
        } catch (error) {
          const errorCode = mapThrownErrorToErrorCode(error)

          captureWithDomain(error, 'growth', {
            tags: { source: 'growth_ai_visibility_web_search_adapter', provider, error_code: errorCode },
            extra: { runId: input.runId, promptId: input.promptId, attempt }
          })

          lastFailure = buildFailedObservation({
            promptInput: input,
            context,
            provider,
            model: defaultModel,
            errorCode,
            latencyMs: 0
          })

          // TASK-1390: rate_limited (throttle de cuota detectado del error crudo) también
          // reintenta — antes solo timeout, y el throttle moría al primer intento.
          if (errorCode === 'timeout' || errorCode === 'rate_limited') {
            if (attempt < context.maxRetries) {
              await sleep(backoffDelayMs(attempt))
            }

            continue
          }

          return lastFailure
        }
      }

      return (
        lastFailure ??
        buildFailedObservation({
          promptInput: input,
          context,
          provider,
          model: defaultModel,
          errorCode: 'provider_error',
          latencyMs: 0
        })
      )
    }
  }
}
