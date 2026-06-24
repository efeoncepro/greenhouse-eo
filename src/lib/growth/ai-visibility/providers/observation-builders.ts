/**
 * TASK-1226 — Growth AI Visibility Grader · Observation builders + error mapping (Slice 2).
 *
 * Factories canónicas para que cada adapter produzca observaciones consistentes
 * (skipped/failed/succeeded) sin filtrar raw provider errors. PURO salvo el clock/
 * id que vienen inyectados por el `ProviderAdapterContext`.
 */

import {
  type GrowthAiVisibilityCitation,
  type GrowthAiVisibilityProviderErrorCode,
  type GrowthAiVisibilityProviderId,
  type GrowthAiVisibilityPromptInput,
  type GrowthAiVisibilityProviderObservation
} from '../contracts'
import { sha256Hex } from '../observation'
import { type ProviderAdapterContext } from './types'

/** Hash estable del request (provider+model+prompt) — NUNCA incluye secret ni PII. */
export const hashProviderRequest = (input: {
  provider: GrowthAiVisibilityProviderId
  model: string
  promptText: string
}): string => sha256Hex(`${input.provider}::${input.model}::${input.promptText}`)

/**
 * Mapea un status HTTP de provider a una clase de error canónica.
 * NO usa el body crudo del provider — solo el status.
 */
export const mapHttpStatusToErrorCode = (status: number): GrowthAiVisibilityProviderErrorCode => {
  if (status === 429) {
    return 'rate_limited'
  }

  if (status === 408 || status === 504) {
    return 'timeout'
  }

  if (status >= 400) {
    return 'provider_error'
  }

  return 'invalid_response'
}

/** Mapea un error de runtime (timeout abort, parse fail) a clase canónica. */
export const mapThrownErrorToErrorCode = (error: unknown): GrowthAiVisibilityProviderErrorCode => {
  if (error instanceof Error && (error.name === 'AbortError' || /timeout|timed out/i.test(error.message))) {
    return 'timeout'
  }

  if (error instanceof SyntaxError) {
    return 'invalid_response'
  }

  return 'provider_error'
}

const baseObservation = (
  input: GrowthAiVisibilityPromptInput,
  context: ProviderAdapterContext,
  provider: GrowthAiVisibilityProviderId,
  model: string,
  providerRequestHash: string
) => ({
  observationId: context.newObservationId(),
  runId: input.runId,
  promptId: input.promptId,
  provider,
  model,
  providerRequestHash,
  providerPolicyVersion: context.providerPolicyVersion,
  promptPackVersion: context.promptPackVersion,
  createdAt: context.now()
})

/** Observación de skip controlado (flag/secret ausente). latency=0, sin evidencia. */
export const buildSkippedObservation = (input: {
  promptInput: GrowthAiVisibilityPromptInput
  context: ProviderAdapterContext
  provider: GrowthAiVisibilityProviderId
  model: string
  errorCode: GrowthAiVisibilityProviderErrorCode
}): GrowthAiVisibilityProviderObservation => ({
  ...baseObservation(
    input.promptInput,
    input.context,
    input.provider,
    input.model,
    hashProviderRequest({ provider: input.provider, model: input.model, promptText: input.promptInput.promptText })
  ),
  status: 'skipped',
  answerTextHash: null,
  answerExcerpt: null,
  citations: [],
  usage: {},
  latencyMs: 0,
  rawEvidencePointer: null,
  errorCode: input.errorCode
})

/** Observación de fallo de ejecución (provider error / rate limit / timeout / invalid). */
export const buildFailedObservation = (input: {
  promptInput: GrowthAiVisibilityPromptInput
  context: ProviderAdapterContext
  provider: GrowthAiVisibilityProviderId
  model: string
  errorCode: GrowthAiVisibilityProviderErrorCode
  latencyMs: number
}): GrowthAiVisibilityProviderObservation => ({
  ...baseObservation(
    input.promptInput,
    input.context,
    input.provider,
    input.model,
    hashProviderRequest({ provider: input.provider, model: input.model, promptText: input.promptInput.promptText })
  ),
  status: input.errorCode === 'rate_limited' ? 'rate_limited' : 'failed',
  answerTextHash: null,
  answerExcerpt: null,
  citations: [],
  usage: {},
  latencyMs: input.latencyMs,
  rawEvidencePointer: null,
  errorCode: input.errorCode
})

/** Observación exitosa con evidencia normalizada. */
export const buildSucceededObservation = (input: {
  promptInput: GrowthAiVisibilityPromptInput
  context: ProviderAdapterContext
  provider: GrowthAiVisibilityProviderId
  model: string
  answerTextHash: string | null
  answerExcerpt: string | null
  citations: GrowthAiVisibilityCitation[]
  usage: Record<string, unknown>
  latencyMs: number
  rawEvidencePointer?: string | null
}): GrowthAiVisibilityProviderObservation => ({
  ...baseObservation(
    input.promptInput,
    input.context,
    input.provider,
    input.model,
    hashProviderRequest({ provider: input.provider, model: input.model, promptText: input.promptInput.promptText })
  ),
  status: 'succeeded',
  answerTextHash: input.answerTextHash,
  answerExcerpt: input.answerExcerpt,
  citations: input.citations,
  usage: input.usage,
  latencyMs: input.latencyMs,
  rawEvidencePointer: input.rawEvidencePointer ?? null,
  errorCode: null
})
