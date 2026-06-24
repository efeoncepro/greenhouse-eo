/**
 * TASK-1226 — Growth AI Visibility Grader · Cost estimator (Slice 4).
 *
 * Estimación APROXIMADA de costo por observación a partir del usage de tokens.
 * La tabla de precios es referencial (USD por 1M tokens, web search no incluido) y
 * se calibra con la corrida de costo agregado N≥3 (follow-up #1 de la calibración
 * TASK-1228). Sirve como guard de presupuesto, NO como contabilidad exacta. PURO.
 */

import { type GrowthAiVisibilityProviderId, type GrowthAiVisibilityProviderObservation } from './contracts'

interface ProviderPricing {
  /** USD por 1M tokens de input. */
  inputPerMillion: number
  /** USD por 1M tokens de output. */
  outputPerMillion: number
}

// Precios referenciales/aproximados (verificar contra pricing vigente al calibrar).
const PROVIDER_PRICING: Record<GrowthAiVisibilityProviderId, ProviderPricing> = {
  openai: { inputPerMillion: 2, outputPerMillion: 8 },
  anthropic: { inputPerMillion: 3, outputPerMillion: 15 },
  perplexity: { inputPerMillion: 1, outputPerMillion: 1 },
  gemini: { inputPerMillion: 0.3, outputPerMillion: 2.5 }
}

const readTokenCount = (usage: Record<string, unknown>, keys: string[]): number => {
  for (const key of keys) {
    const value = usage[key]

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  return 0
}

/** Estima el costo USD de una observación. Skipped/failed = 0 (no consumieron tokens cobrables). */
export const estimateObservationCostUsd = (
  observation: GrowthAiVisibilityProviderObservation
): number => {
  if (observation.status !== 'succeeded') {
    return 0
  }

  const pricing = PROVIDER_PRICING[observation.provider]
  const usage = observation.usage ?? {}

  const inputTokens = readTokenCount(usage, ['input_tokens', 'prompt_tokens', 'promptTokenCount'])
  const outputTokens = readTokenCount(usage, ['output_tokens', 'completion_tokens', 'candidatesTokenCount'])

  const cost =
    (inputTokens / 1_000_000) * pricing.inputPerMillion +
    (outputTokens / 1_000_000) * pricing.outputPerMillion

  return Number(cost.toFixed(6))
}

/** Suma el costo estimado de un conjunto de observaciones. */
export const estimateRunCostUsd = (
  observations: readonly GrowthAiVisibilityProviderObservation[]
): number =>
  Number(observations.reduce((total, observation) => total + estimateObservationCostUsd(observation), 0).toFixed(6))
