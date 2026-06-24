/**
 * TASK-1226 — Growth AI Visibility Grader · Fake/no-op adapter (Slice 2).
 *
 * Adapter determinista para local/test: NO llama red ni resuelve secretos.
 * Producir evidencia reproducible permite correr el smoke/eval harness sin
 * credenciales (default del runtime cuando el grader corre sin providers reales).
 * El contenido es SIMULADO y neutro — no codifica findings reales del spike.
 */

import {
  type GrowthAiVisibilityCitation,
  type GrowthAiVisibilityProviderId,
  type GrowthAiVisibilityPromptInput,
  type GrowthAiVisibilityProviderObservation
} from '../contracts'
import { buildCitations, sha256Hex } from '../observation'
import { buildFailedObservation, buildSkippedObservation, buildSucceededObservation } from './observation-builders'
import { type ProviderAdapter, type ProviderAdapterCapabilities, type ProviderAdapterContext } from './types'

export type FakeAdapterBehavior = 'succeed' | 'skip' | 'fail'

export interface FakeAdapterOptions {
  /** Provider que el fake representa (para smoke multi-provider). Default 'openai'. */
  provider?: GrowthAiVisibilityProviderId
  model?: string
  /** Comportamiento forzado (para ejercer paths de degradación en tests). Default 'succeed'. */
  behavior?: FakeAdapterBehavior
  enabled?: boolean
}

/** Latencia determinista derivada del request (rango 50-550ms). */
const deterministicLatency = (seed: string): number => {
  const hash = sha256Hex(seed)

  return 50 + (Number.parseInt(hash.slice(0, 4), 16) % 500)
}

const buildFakeCitations = (input: GrowthAiVisibilityPromptInput): GrowthAiVisibilityCitation[] => {
  if (!input.websiteUrl) {
    return []
  }

  return buildCitations([{ url: input.websiteUrl, title: input.brandName, sourceType: 'owned' }])
}

export const createFakeProviderAdapter = (options: FakeAdapterOptions = {}): ProviderAdapter => {
  const provider = options.provider ?? 'openai'
  const model = options.model ?? `fake-${provider}`
  const behavior: FakeAdapterBehavior = options.behavior ?? 'succeed'
  const enabled = options.enabled ?? true

  const capabilities: ProviderAdapterCapabilities = {
    provider,
    supportsWebSearch: true,
    defaultModel: model
  }

  return {
    provider,
    capabilities,
    isEnabled: async () => enabled,
    runPrompt: async (
      input: GrowthAiVisibilityPromptInput,
      context: ProviderAdapterContext
    ): Promise<GrowthAiVisibilityProviderObservation> => {
      if (behavior === 'skip') {
        return buildSkippedObservation({
          promptInput: input,
          context,
          provider,
          model,
          errorCode: 'provider_disabled'
        })
      }

      if (behavior === 'fail') {
        return buildFailedObservation({
          promptInput: input,
          context,
          provider,
          model,
          errorCode: 'provider_error',
          latencyMs: deterministicLatency(`${provider}:${input.promptId}:fail`)
        })
      }

      const excerpt = `Respuesta simulada de ${provider} para ${input.promptId} sobre ${input.brandName} en ${input.market}.`

      return buildSucceededObservation({
        promptInput: input,
        context,
        provider,
        model,
        answerTextHash: sha256Hex(excerpt),
        answerExcerpt: excerpt,
        citations: buildFakeCitations(input),
        usage: { input_tokens: 0, output_tokens: 0, simulated: true },
        latencyMs: deterministicLatency(`${provider}:${input.promptId}:${input.brandName}`),
        rawEvidencePointer: null
      })
    }
  }
}
